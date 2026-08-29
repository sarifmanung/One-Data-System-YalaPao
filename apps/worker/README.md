# One Data Worker

The worker process is intentionally reserved for the durable outbox and
monthly Special-Allowances snapshot jobs. The current foundation does not
start a worker because it has no database-backed queue or mutation to consume
yet. It will be added as a separate process before the first asynchronous
integration goes live.
