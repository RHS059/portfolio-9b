import type { ReactNode } from "react"
import { getTweetReference, isSafeArticleLink, type RichTextNode } from "@/lib/article-schema"
import ArticleTweet from "./article-tweet"

function renderNode(node: RichTextNode, key: number): ReactNode {
  const children = node.content?.map(renderNode)
  switch (node.type) {
    case "text": {
      let text: ReactNode = node.text
      for (const mark of node.marks ?? []) {
        switch (mark.type) {
          case "bold": text = <strong>{text}</strong>; break
          case "italic": text = <em>{text}</em>; break
          case "underline": text = <u>{text}</u>; break
          case "strike": text = <s>{text}</s>; break
          case "code": text = <code>{text}</code>; break
          case "link": if (mark.attrs && isSafeArticleLink(mark.attrs.href)) text = <a href={mark.attrs.href} title={mark.attrs.title}>{text}</a>; break
        }
      }
      return <span key={key}>{text}</span>
    }
    case "paragraph": return <p key={key}>{children?.length ? children : <br />}</p>
    case "heading": {
      const Heading = node.attrs?.level === 3 ? "h3" : node.attrs?.level === 4 ? "h4" : "h2"
      return <Heading key={key}>{children}</Heading>
    }
    case "bulletList": return <ul key={key}>{children}</ul>
    case "orderedList": return <ol key={key} start={node.attrs?.start}>{children}</ol>
    case "listItem": return <li key={key}>{children}</li>
    case "blockquote": return <blockquote key={key}>{children}</blockquote>
    case "codeBlock": return <pre key={key}><code>{node.content?.map((child) => child.text ?? "").join("")}</code></pre>
    case "hardBreak": return <br key={key} />
    case "horizontalRule": return <hr key={key} />
    case "tweet": {
      const tweet = getTweetReference(node.attrs?.url ?? "")
      return tweet ? <ArticleTweet key={key} tweet={tweet} /> : null
    }
    case "doc": return <div key={key}>{children}</div>
  }
}

export default function ArticleRichText({ body }: { body: RichTextNode }) {
  return <>{body.content?.map(renderNode)}</>
}
