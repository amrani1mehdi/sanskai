import { BlogEditor } from "@/components/crm/blog-editor";

export default async function EditPostPage({
  params,
}: PageProps<"/admin/blog/[id]">) {
  const { id } = await params;

  return <BlogEditor id={id} />;
}
