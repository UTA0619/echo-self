import type { Metadata } from 'next'
import { DemoClient } from './DemoClient'

export const metadata: Metadata = {
  title: 'ECHO — Live Demo',
  description: 'Experience the ECHO memory loop. No account, no backend — fully local.',
}

// Fully client-rendered, backend-free experience.
export default function DemoPage() {
  return <DemoClient />
}
