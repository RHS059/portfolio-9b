import { z } from "zod"
import heroes from "@/content/article-heroes.json"
import { landscapeCompositions } from "./landscape-composition"

const heroSchema = z.object({
  id: z.string().min(1),
  src: z.string().startsWith("/article-heroes/"),
  alt: z.string().min(1),
  position: z.string().regex(/^\d+% \d+%$/),
  parallax: z.object({
    frames: z.array(z.string().startsWith("/article-heroes/")).min(2).optional(),
    duration: z.number().positive().optional(),
    frameRegion: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
    scene: z.enum(Object.keys(landscapeCompositions) as [keyof typeof landscapeCompositions, ...(keyof typeof landscapeCompositions)[]]),
  }),
})

export default z.object({ images: z.array(heroSchema) }).parse(heroes)
