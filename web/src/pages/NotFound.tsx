import { Link } from 'react-router'
import { Panel } from '@/components/console/Panel'

export function NotFound() {
  return (
    <Panel label="404 · Not found" className="mx-auto max-w-xl">
      <p className="mt-4 font-sans text-sm text-soft">
        There is nothing at this address. <Link to="/console">Back to the console</Link>.
      </p>
    </Panel>
  )
}
