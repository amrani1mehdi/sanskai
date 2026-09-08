import { BlogWorkspace } from "@/components/crm/blog-workspace";

/**
 * Articles — everything written for the public blog, drafts included.
 *
 * The second section of the back office, and the reason the navigation rail
 * came back: it is the one screen here that is not about a lead.
 */
export default function BlogPage() {
  return <BlogWorkspace />;
}
