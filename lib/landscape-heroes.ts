import { z } from "zod"
import heroes from "@/content/article-heroes.json"

const heroSchema = z.object({
  id: z.string().min(1),
  src: z.string().startsWith("/article-heroes/"),
  alt: z.string().min(1),
  position: z.string().regex(/^\d+% \d+%$/),
  parallax: z.object({
    atlas: z.string().startsWith("/article-heroes/parallax/"),
    waterline: z.number().min(0).max(1.1),
    foreground: z.enum(["grass", "boardwalk", "tree", "garden", "coast", "rocks", "marina"]),
  }),
})

export default z.object({ images: z.array(heroSchema) }).parse(heroes)
