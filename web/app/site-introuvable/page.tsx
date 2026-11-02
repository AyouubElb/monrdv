import { notFound } from 'next/navigation';

// The proxy rewrites unknown hosts and direct `/sites/...` requests here. Calling `notFound()`
// before anything streams makes the status a real 404 (inside a streamed layout it would be 200).

// This page never renders (it always throws `notFound()`), so the dev only instant navigation
// check has nothing to validate here.
export const instant = false;

export default function SiteIntrouvable() {
  notFound();
}
