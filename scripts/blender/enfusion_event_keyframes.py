"""Enfusion Event Keyframes - Blender add-on.

Adds an ``enfusion_event_keyframes`` F-curve row to actions so Enfusion animation
events can be keyed in the Action Editor, and syncs those events with the
``$events`` block of the .txa files written by Enfusion Blender Tools (EBT).

Requires EnfusionBlenderTools to be installed: it is used to resolve which .txa
file(s) an action was exported to.
"""

import os
import re

import bpy
from bpy.props import BoolProperty, CollectionProperty, IntProperty, StringProperty
from bpy.types import Operator, Panel, PropertyGroup

bl_info = {
    "name": "Enfusion Event Keyframes",
    "author": "",
    "version": (0, 1, 0),
    "blender": (4, 4, 0),
    "location": "Dope Sheet > Action Editor > Sidebar > Action > Enfusion Events",
    "description": "Keyframe Enfusion animation events on actions and write them into exported .txa files",
    "category": "Animation",
}

EVENT_PROP = "enfusion_event_keyframes"
EVENT_DATA_PATH = '["%s"]' % EVENT_PROP

# ---------------------------------------------------------------------------
# TXA text handling (pure functions, no bpy)
# ---------------------------------------------------------------------------

_EVENTS_BLOCK_RE = re.compile(r"^([ \t]*)\$events[ \t]*\{[^\n]*\n(.*?)^\1\}[ \t]*(?=\r?$)", re.M | re.S)
_CUST_PROPS_RE = re.compile(r"^([ \t]*)\$custProps[ \t]*\{", re.M)
_EVENT_LINE_RE = re.compile(r'^[ \t]*#event[ \t]+(-?\d+)[ \t]+"((?:[^"\\]|\\.)*)"')


def _unescape(s):
    return s.replace('\\"', '"').replace("\\\\", "\\")


def _escape(s):
    return s.replace("\\", "\\\\").replace('"', '\\"')


def parse_txa_events(text):
    """Return list of (txa_frame, name, raw_line) from the $events block."""
    match = _EVENTS_BLOCK_RE.search(text)
    if match is None:
        return []
    events = []
    for line in match.group(2).splitlines():
        m = _EVENT_LINE_RE.match(line)
        if m:
            events.append((int(m.group(1)), _unescape(m.group(2)), line.rstrip("\r\n")))
    return events


def format_txa_event(txa_frame, name, indent="  "):
    esc = _escape(name)
    inner = 'AnimSrcEventGeneric {  Name \\"%s\\"  Frame %d }' % (esc, txa_frame)
    return '%s#event %d "%s" "%s" -1 0 "" 0' % (indent, txa_frame, esc, inner)


def write_txa_events(text, events):
    """Return ``text`` with its $events block replaced by ``events`` [(txa_frame, name)].

    Lines of events that already exist in the file (same frame and name) are kept
    verbatim so any extra fields set in Workbench survive. Everything outside the
    $events block is left untouched.
    """
    nl = "\r\n" if "\r\n" in text else "\n"
    existing = {(f, n): raw for f, n, raw in parse_txa_events(text)}

    match = _EVENTS_BLOCK_RE.search(text)
    if match is not None:
        indent = match.group(1)
    else:
        cp = _CUST_PROPS_RE.search(text)
        indent = cp.group(1) if cp else " "

    lines = []
    for frame, name in sorted(events, key=lambda e: (e[0], e[1])):
        lines.append(existing.get((frame, name)) or format_txa_event(frame, name, indent + " "))
    block = indent + "$events {" + nl + "".join(line + nl for line in lines) + indent + "}"

    if match is not None:
        return text[: match.start()] + block + text[match.end() :]
    if cp is not None:
        return text[: cp.start()] + block + nl + text[cp.start() :]
    end = text.rstrip().rfind("}")
    if end < 0:
        raise ValueError("Not a .txa file: closing brace not found")
    return text[:end] + block + nl + text[end:]


# ---------------------------------------------------------------------------
# EBT integration
# ---------------------------------------------------------------------------


def _ebt():
    try:
        from EnfusionBlenderTools.core import utils as core_utils
        from EnfusionBlenderTools.txa.operators import EBT_OT_export_txa
    except ImportError:
        return None
    return core_utils, EBT_OT_export_txa


def _txa_paths(context, action):
    """All .txa files the enabled export blocks of ``action`` write to."""
    ebt = _ebt()
    if ebt is None or not hasattr(action, "ebt_txa_export"):
        return []
    base = ebt[0].convert_to_absolute_path(context.scene.ebt_txa_export_location)
    paths = []
    for export in action.ebt_txa_export:
        if export.export_enabled:
            name = export.export_file or bpy.path.clean_name(action.name)
            paths.append(os.path.abspath(os.path.join(base, name + ".txa")))
    return paths


# ---------------------------------------------------------------------------
# Action data
# ---------------------------------------------------------------------------


def _active_action(context):
    action = getattr(context, "active_action", None)
    if action is None and context.object and context.object.animation_data:
        action = context.object.animation_data.action
    return action


def _fcurve(action, create=False):
    fc = action.fcurves.find(EVENT_DATA_PATH)
    if fc is None and create:
        fc = action.fcurves.new(EVENT_DATA_PATH, index=0)
        # Give the property to objects using this action so the channel resolves.
        for obj in bpy.data.objects:
            if obj.animation_data and obj.animation_data.action == action and EVENT_PROP not in obj:
                obj[EVENT_PROP] = 0
    return fc


def _start_frame(action):
    """Blender frame that maps to Enfusion frame 0."""
    if action.use_frame_range:
        return int(action.frame_range[0])
    frames = [kp.co[0] for fc in action.fcurves if fc.data_path != EVENT_DATA_PATH for kp in fc.keyframe_points]
    return int(min(frames)) if frames else 0


def _sort_events(action):
    events = action.enfusion_events
    for i in range(len(events)):
        j = min(range(i, len(events)), key=lambda k: events[k].frame)
        if j != i:
            events.move(j, i)


def _rebuild_fcurve(action):
    """Make the F-curve keys mirror the event list (list is the source of truth)."""
    fc = _fcurve(action, create=True)
    fc.keyframe_points.clear()
    frames = sorted({ev.frame for ev in action.enfusion_events})
    fc.keyframe_points.add(len(frames))
    for kp, frame in zip(fc.keyframe_points, frames):
        kp.co = (frame, 0.0)
        kp.interpolation = "CONSTANT"
    fc.update()


def _sync_from_fcurve(action):
    """Pull keys the user moved/added/deleted in the editor back into the event list."""
    fc = _fcurve(action)
    events = action.enfusion_events
    if fc is None:
        if len(events):
            _rebuild_fcurve(action)
        return
    key_frames = sorted({int(round(kp.co[0])) for kp in fc.keyframe_points})
    event_frames = {ev.frame for ev in events}
    new_frames = [f for f in key_frames if f not in event_frames]
    orphans = sorted((ev for ev in events if ev.frame not in key_frames), key=lambda ev: ev.frame)

    # A moved key shows up as one new frame plus one orphaned event: pair them up.
    for ev, frame in zip(orphans, new_frames):
        ev.frame = frame
    for frame in new_frames[len(orphans) :]:
        events.add().frame = frame
    for i in reversed(range(len(events))):
        if events[i].frame not in key_frames:
            events.remove(i)
    _sort_events(action)
    _rebuild_fcurve(action)


def _on_frame_update(self, _context):
    _rebuild_fcurve(self.id_data)


class EEK_PG_event(PropertyGroup):
    name: StringProperty(name="Event", description="Enfusion event name (AnimSrcEventGeneric Name)")  # type: ignore
    frame: IntProperty(name="Frame", description="Blender frame of the event", update=_on_frame_update)  # type: ignore


# ---------------------------------------------------------------------------
# Operators
# ---------------------------------------------------------------------------


class EEK_OT_add_event(Operator):
    bl_idname = "eek.add_event"
    bl_label = "Add Event Keyframe"
    bl_description = "Add an Enfusion event keyframe at the current frame"
    bl_options = {"REGISTER", "UNDO"}

    @classmethod
    def poll(cls, context):
        return _active_action(context) is not None

    def execute(self, context):
        action = _active_action(context)
        _sync_from_fcurve(action)
        action.enfusion_events.add().frame = context.scene.frame_current
        _sort_events(action)
        _rebuild_fcurve(action)
        return {"FINISHED"}


class EEK_OT_remove_event(Operator):
    bl_idname = "eek.remove_event"
    bl_label = "Remove Event Keyframe"
    bl_options = {"REGISTER", "UNDO"}

    index: IntProperty()  # type: ignore

    def execute(self, context):
        action = _active_action(context)
        action.enfusion_events.remove(self.index)
        _rebuild_fcurve(action)
        return {"FINISHED"}


class EEK_OT_sync_events(Operator):
    bl_idname = "eek.sync_events"
    bl_label = "Sync From Keyframes"
    bl_description = "Update the event list from keys moved, added or deleted in the editor"
    bl_options = {"REGISTER", "UNDO"}

    @classmethod
    def poll(cls, context):
        return _active_action(context) is not None

    def execute(self, context):
        _sync_from_fcurve(_active_action(context))
        return {"FINISHED"}


def _write_events_to_txa(report, context, action, paths):
    start = _start_frame(action)
    events = [(ev.frame - start, ev.name) for ev in action.enfusion_events]
    for path in paths:
        if not os.path.isfile(path):
            report({"WARNING"}, "Enfusion Events - %s not found. Export the animation to .txa first." % path)
            continue
        with open(path, encoding="utf-8", newline="") as f:
            text = f.read()
        try:
            text = write_txa_events(text, events)
        except ValueError as e:
            report({"ERROR"}, "Enfusion Events - %s: %s" % (path, e))
            continue
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(text)
        report({"INFO"}, "Enfusion Events - wrote %d event(s) to %s" % (len(events), path))


class EEK_OT_export_events(Operator):
    bl_idname = "eek.export_events"
    bl_label = "Export Events to TXA"
    bl_description = "Write this action's event keyframes into the .txa file(s) it was exported to"
    bl_options = {"REGISTER"}

    @classmethod
    def poll(cls, context):
        return _active_action(context) is not None and _ebt() is not None

    def execute(self, context):
        action = _active_action(context)
        _sync_from_fcurve(action)
        paths = _txa_paths(context, action)
        if not paths:
            self.report({"ERROR"}, "Enfusion Events - action has no enabled TXA export block")
            return {"CANCELLED"}
        _write_events_to_txa(self.report, context, action, paths)
        return {"FINISHED"}


class EEK_OT_import_events(Operator):
    bl_idname = "eek.import_events"
    bl_label = "Import Events from TXA"
    bl_description = "Read events from the .txa file this action was exported to"
    bl_options = {"REGISTER", "UNDO"}

    replace: BoolProperty(name="Replace existing events", description="Off: keep current events and add the ones from the .txa", default=True)  # type: ignore

    @classmethod
    def poll(cls, context):
        return _active_action(context) is not None and _ebt() is not None

    def invoke(self, context, _event):
        return context.window_manager.invoke_props_dialog(self)

    def execute(self, context):
        action = _active_action(context)
        paths = [p for p in _txa_paths(context, action) if os.path.isfile(p)]
        if not paths:
            self.report({"ERROR"}, "Enfusion Events - no exported .txa found for this action")
            return {"CANCELLED"}
        with open(paths[0], encoding="utf-8", newline="") as f:
            txa_events = parse_txa_events(f.read())

        _sync_from_fcurve(action)
        start = _start_frame(action)
        events = action.enfusion_events
        if self.replace:
            events.clear()
        present = {(ev.frame, ev.name) for ev in events}
        added = 0
        for txa_frame, name, _raw in txa_events:
            frame = txa_frame + start
            if (frame, name) not in present:
                ev = events.add()
                ev.name = name
                ev.frame = frame
                added += 1
        _sort_events(action)
        _rebuild_fcurve(action)
        self.report({"INFO"}, "Enfusion Events - imported %d event(s) from %s" % (added, paths[0]))
        return {"FINISHED"}


# ---------------------------------------------------------------------------
# Auto-apply after the EBT .txa export
# ---------------------------------------------------------------------------

_ebt_export_execute = None


def _patched_export_execute(self, context):
    result = _ebt_export_execute(self, context)
    if "FINISHED" not in result:
        return result
    core_utils, exporter = _ebt()
    base = core_utils.convert_to_absolute_path(context.scene.ebt_txa_export_location)
    for action in bpy.data.actions:
        if not len(action.enfusion_events):
            continue
        # Same selection the EBT exporter just used, so only freshly written files are touched.
        paths = [os.path.abspath(os.path.join(base, e.targetFile + ".txa")) for e in exporter.get_animation_exports(action)]
        if paths:
            _sync_from_fcurve(action)
            _write_events_to_txa(self.report, context, action, paths)
    return result


# ---------------------------------------------------------------------------
# UI
# ---------------------------------------------------------------------------


class EEK_PT_events(Panel):
    bl_space_type = "DOPESHEET_EDITOR"
    bl_region_type = "UI"
    bl_category = "Action"
    bl_label = "Enfusion Events"

    @classmethod
    def poll(cls, context):
        return _active_action(context) is not None

    def draw(self, context):
        layout = self.layout
        action = _active_action(context)
        if _ebt() is None:
            layout.label(text="EnfusionBlenderTools not installed", icon="ERROR")

        row = layout.row(align=True)
        row.operator("eek.add_event", icon="KEYFRAME_HLT")
        row.operator("eek.sync_events", text="", icon="FILE_REFRESH")

        current = context.scene.frame_current
        for i, ev in enumerate(action.enfusion_events):
            row = layout.row(align=True)
            row.active = ev.frame == current
            row.prop(ev, "frame", text="")
            row.prop(ev, "name", text="")
            row.operator("eek.remove_event", text="", icon="X").index = i

        layout.separator()
        row = layout.row(align=True)
        row.operator("eek.export_events", text="Export Events", icon="EXPORT")
        row.operator("eek.import_events", text="Import Events", icon="IMPORT")


classes = (EEK_PG_event, EEK_OT_add_event, EEK_OT_remove_event, EEK_OT_sync_events, EEK_OT_export_events, EEK_OT_import_events, EEK_PT_events)


def register():
    global _ebt_export_execute
    for cls in classes:
        bpy.utils.register_class(cls)
    bpy.types.Action.enfusion_events = CollectionProperty(type=EEK_PG_event)

    ebt = _ebt()
    if ebt is not None and _ebt_export_execute is None:
        _ebt_export_execute = ebt[1].execute
        ebt[1].execute = _patched_export_execute


def unregister():
    global _ebt_export_execute
    if _ebt_export_execute is not None:
        _ebt()[1].execute = _ebt_export_execute
        _ebt_export_execute = None
    del bpy.types.Action.enfusion_events
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)


if __name__ == "__main__":
    register()
