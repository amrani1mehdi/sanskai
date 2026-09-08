import { BlogEditor } from "@/components/crm/blog-editor";

/**
 * A new article.
 *
 * A static segment, so it wins over `[id]` and "new" is never read as the id of
 * an article that does not exist.
 */
export default function NewPostPage() {
  return <BlogEditor />;
}
