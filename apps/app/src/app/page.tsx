import { redirect } from 'next/navigation';

/**
 * Root page — redirects to /calendar.
 * All app content lives under the (app) route group.
 */
export default function Root() {
  redirect('/calendar');
}
