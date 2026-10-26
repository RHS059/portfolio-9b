"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { createPortal } from "react-dom"

interface ContentBlock {
  type: "paragraph" | "list" | "image" | "quote" | "cards" | "image-card" | "button" | "placeholder-image" | "table" | "decision-cards"
  content:
    | string
    | string[]
    | { header: string; text: string }[]
    | { src: string; alt: string; caption: string }
    | { text: string; url: string; logo?: string; logoAlt?: string }
    | { description: string }
    | { headers: string[]; rows: string[][] }
    | { header: string; text: string; image?: string; imagePlaceholder?: string }[]
  caption?: string
}

interface ProjectSectionProps {
  id: string
  title: string
  content: ContentBlock[]
  imagesSideBySide?: boolean
}

export default function ProjectSection({ id, title, content, imagesSideBySide = false }: ProjectSectionProps) {
  const [lightbox, setLightbox] = useState<{ src: string; title: string; caption: string } | null>(null)

  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (!lightbox) return
    const previousFocus = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    dialogRef.current?.showModal()
    return () => {
      document.body.style.overflow = overflow
      previousFocus?.focus()
    }
  }, [lightbox])

  const openLightbox = useCallback((src: string, title: string, caption: string) => {
    setLightbox({ src, title, caption })
  }, [])

  const closeLightbox = useCallback(() => {
    setLightbox(null)
  }, [])

  const renderContentBlock = (block: ContentBlock, index: number) => {
    switch (block.type) {
      case "paragraph":
        return (
          <p key={index} className="text-[#181425] leading-relaxed text-base md:text-lg">
            {block.content as string}
          </p>
        )

      case "list":
        return (
          <ul key={index} className="space-y-2 text-[#181425]">
            {(block.content as string[]).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-base md:text-lg">
                <span className="w-1.5 h-1.5 bg-[#685c84] rounded-full mt-2.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        )

      case "cards":
        return (
          <div key={index} className="grid md:grid-cols-2 gap-4">
            {(block.content as { header: string; text: string }[]).map((card, i) => (
              <div key={i} className="bg-[#9b95b2]/15 rounded-lg p-6 space-y-3">
                <h3 className="font-semibold text-[#181425] text-lg">{card.header}</h3>
                <p className="text-[#181425] leading-relaxed text-base">{card.text}</p>
              </div>
            ))}
          </div>
        )

      case "image-card":
        const imageContent = block.content as { src: string; alt: string; caption: string }
        return (
          <figure key={index} className="bg-[#9b95b2]/15 rounded-lg p-4 md:p-6 h-full flex flex-col gap-4">
            <button
              type="button"
              onClick={() => openLightbox(imageContent.src, imageContent.alt, imageContent.caption)}
              aria-label={`Enlarge image: ${imageContent.caption}`}
              className="group relative block w-full aspect-[4/3] shrink-0 overflow-hidden rounded-lg shadow-md cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#685c84]"
            >
              <img
                src={imageContent.src || "/placeholder.svg"}
                alt={imageContent.alt}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 group-focus-visible:scale-105 motion-reduce:transition-none motion-reduce:scale-100"
              />
              <span aria-hidden="true" className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-black/80 px-3 py-2 text-xs font-medium text-white shadow-sm transition-transform duration-200 group-hover:-translate-y-1 group-focus-visible:-translate-y-1 motion-reduce:transition-none motion-reduce:translate-y-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6M7 10h6M10 7v6"/></svg>
                Zoom in
              </span>
            </button>
            <figcaption className="text-sm text-[#181425] text-center italic">{imageContent.caption}</figcaption>
          </figure>
        )

      case "image":
        return (
          <div key={index} className="space-y-2">
            <img
              src={(block.content as string) || "/placeholder.svg"}
              alt={block.caption || "Project image"}
              className="w-full h-auto rounded-lg shadow-md"
            />
            {block.caption && <p className="text-sm text-gray-600 text-center italic">{block.caption}</p>}
          </div>
        )

      case "quote":
        return (
          <blockquote key={index} className="border-l-4 border-[#685c84] pl-4 py-2 bg-gray-50 rounded-r-lg">
            <p className="text-[#181425] italic text-base md:text-lg">{block.content as string}</p>
          </blockquote>
        )

      case "decision-cards": {
        const decisionCards = block.content as { header: string; text: string; image?: string; imagePlaceholder?: string }[]
        return (
          <div key={index} className="grid md:grid-cols-2 gap-6">
            {decisionCards.map((card, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow-md border border-gray-100">
                <div className="aspect-[16/9] bg-gray-200 overflow-hidden">
                  {card.image ? (
                    <button
                      type="button"
                      onClick={() => openLightbox(card.image!, card.header, card.imagePlaceholder || card.header)}
                      className="w-full h-full cursor-zoom-in block"
                      aria-label={`View ${card.header} image full size`}
                    >
                      <img
                        src={card.image || "/placeholder.svg"}
                        alt={card.imagePlaceholder || card.header}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                      />
                    </button>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <p className="text-gray-500 text-center text-sm leading-relaxed max-w-xs">
                        {card.imagePlaceholder || "Screenshot placeholder"}
                      </p>
                    </div>
                  )}
                </div>
                <div className="p-6 space-y-3">
                  <h3 className="font-semibold text-[#181425] text-lg">{card.header}</h3>
                  <p className="text-[#181425] leading-relaxed text-base">{card.text}</p>
                </div>
              </div>
            ))}
          </div>
        )
      }

      case "placeholder-image": {
        const placeholderContent = block.content as { description: string }
        return (
          <div key={index} className="bg-gray-200 rounded-lg p-8 md:p-12 flex items-center justify-center min-h-[200px]">
            <p className="text-gray-500 text-center text-sm md:text-base leading-relaxed max-w-lg">
              {placeholderContent.description}
            </p>
          </div>
        )
      }

      case "table": {
        const tableContent = block.content as { headers: string[]; rows: string[][] }
        return (
          <div key={index} className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#9b95b2]/15">
                  {tableContent.headers.map((header, i) => (
                    <th key={i} className="px-6 py-3 text-sm font-semibold text-[#181425]">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableContent.rows.map((row, i) => (
                  <tr key={i} className="border-t border-gray-200">
                    {row.map((cell, j) => (
                      <td key={j} className="px-6 py-3 text-base text-[#181425]">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      case "button":
        const buttonContent = block.content as { text: string; url: string; logo?: string; logoAlt?: string }
        return (
          <div key={index} className="flex justify-center">
            <a
              href={buttonContent.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-[#685c84] hover:bg-[#3b2d56] text-white px-6 py-3 rounded-lg font-medium transition-colors text-base"
            >
              {buttonContent.text}
              {buttonContent.logo && (
                <img src={buttonContent.logo || "/placeholder.svg"} alt={buttonContent.logoAlt || `${buttonContent.text} logo`} className="h-6 w-auto" />
              )}
            </a>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <>
      <section id={id} className="scroll-mt-[96px] space-y-6">
        <h2
          className="text-2xl md:text-3xl font-semibold text-[#181425] text-left focus:outline-none focus:ring-2 focus:ring-[#685c84] focus:ring-offset-2 rounded"
          tabIndex={-1}
        >
          {title}
        </h2>
        <div className={imagesSideBySide ? "grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch" : "space-y-4"}>
          {content.map((block, index) => imagesSideBySide ? (
            <div key={index} className={block.type === "image-card" ? "min-w-0" : "md:col-span-2 min-w-0"}>
              {renderContentBlock(block, index)}
            </div>
          ) : renderContentBlock(block, index))}
        </div>
      </section>

      {lightbox && createPortal(
        <dialog
          ref={dialogRef}
          aria-label="Image preview"
          className="fixed inset-0 m-0 h-[100dvh] w-screen max-h-none max-w-none border-0 bg-transparent p-4 md:p-8 text-white backdrop:bg-black/80"
          onCancel={(event) => { event.preventDefault(); closeLightbox() }}
          onClick={(event) => { if (event.target === event.currentTarget) closeLightbox() }}
        >
          <button
            type="button"
            onClick={closeLightbox}
            autoFocus
            className="fixed top-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label="Close image preview"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg>
          </button>
          <div className="pointer-events-none flex min-h-full items-center justify-center">
            <figure className="pointer-events-auto flex max-w-[90vw] flex-col items-center gap-4">
              <img
                src={lightbox.src || "/placeholder.svg"}
                alt={lightbox.title}
                className="max-w-full max-h-[75dvh] object-contain rounded-lg shadow-2xl"
              />
              <figcaption className="max-w-3xl text-center text-sm text-white/90">{lightbox.caption}</figcaption>
            </figure>
          </div>
        </dialog>, document.body
      )}
    </>
  )
}
