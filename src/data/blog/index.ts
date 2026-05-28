import type { BlogPost } from './types'
import { post as shouldIKeepPluggedIn } from './should-i-keep-macbook-plugged-in'
import { post as healthyCycleCount } from './healthy-cycle-count-macbook'
import { post as obcExplained } from './optimized-battery-charging-explained'

/** Master post list, newest first. Drives the /blog index, the Schema.org
 * Blog ItemList, and the per-slug $route lookup. */
export const BLOG_POSTS: ReadonlyArray<BlogPost> = [
  shouldIKeepPluggedIn,
  obcExplained,
  healthyCycleCount,
]

export const POSTS_BY_SLUG: Readonly<Record<string, BlogPost>> = Object.freeze(
  Object.fromEntries(BLOG_POSTS.map((p) => [p.slug, p])),
)
