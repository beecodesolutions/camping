export function scrollWorkspaceToTop() {
  const options = { top: 0, left: 0, behavior: 'instant' } as const
  document.getElementById('workspace-scroll')?.scrollTo(options)
  window.scrollTo(options)
}
