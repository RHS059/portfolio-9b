import Image from "next/image"
import styles from "@/app/writing/writing.module.css"

type Hero = { src: string; alt: string; position: string }

export default function LandscapeHero({ image }: { image: Hero }) {
  return (
    <div className={styles.hero}>
      <Image src={image.src} alt={image.alt} width={1920} height={1080} sizes="(max-width: 900px) 100vw, 75vw" loading="eager" className={styles.heroImage} style={{ objectPosition: image.position }} />
    </div>
  )
}
