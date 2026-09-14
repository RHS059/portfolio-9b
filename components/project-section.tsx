"use client"

import { useState, useCallback } from "react"

interface ContentBlock {
  type: "paragraph" | "list" | "image" | "quote" | "cards" | "image-card" | "button" | "placeholder-image" | "table" | "decision-cards"
  content:
    | string
    | string[]
    | { header: string; text: string }[]
    | { src: string; alt: string; caption: string }
    | { text: string; url: string; logo?: string }
    | { description: string }
    | { headers: string[]; rows: string[][] }
    | { header: string; text: string; image?: string; imagePlaceholder?: string }[]
  caption?: string
}

interface ProjectSectionProps {
  id: string
  title: string
  content: ContentBlock[]
}

export default function ProjectSection({ id, title, content }: ProjectSectionProps) {
  const [lightbox, setLightbox] = useState<{ src: string; title: string; caption: string } | null>(null)

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
          <div key={index} className="bg-[#9b95b2]/15 rounded-lg p-6 space-y-4">
            <img
              src={imageContent.src || "/placeholder.svg"}
              alt={imageContent.alt}
              className="w-full h-auto rounded-lg shadow-md"
            />
            <p className="text-sm text-[#181425] text-center italic">{imageContent.caption}</p>
          </div>
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
                        alt={card.header}
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
        const buttonContent = block.content as { text: string; url: string; logo?: string }
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
                <img src={buttonContent.logo || "/placeholder.svg"} alt="Logo" className="h-6 w-auto" />
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
        <div className="space-y-4">{content.map((block, index) => renderContentBlock(block, index))}</div>
      </section>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={closeLightbox}
          onKeyDown={(e) => e.key === "Escape" && closeLightbox()}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors z-10"
            aria-label="Close image preview"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <div
            className="flex flex-col items-center gap-4 max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.src || "/placeholder.svg"}
              alt={lightbox.title}
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
            />
            <div className="text-center space-y-1">
              <p className="text-white font-semibold text-lg">{lightbox.title}</p>
              <p className="text-white/80 text-sm">{lightbox.caption}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
