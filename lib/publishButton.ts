import { createIsolatedElement } from '@webext-core/isolated-element'
import styles from './publish-button.css?inline'

export interface PublishButtonConfig {
  label?: string
  /** Tailwind bg color class, e.g. 'bg-emerald-600' or 'bg-[#10a37f]' */
  colorClass: string
  /** Styles applied to the outer host element (e.g. for absolute positioning) */
  outerStyles?: Partial<CSSStyleDeclaration>
}

export async function createPublishButton(config: PublishButtonConfig): Promise<{
  parentElement: HTMLElement
  button: HTMLButtonElement
}> {
  const { label = 'Publish', colorClass, outerStyles } = config

  const { parentElement, isolatedElement } = await createIsolatedElement({
    name: 'dc-publish-btn',
    css: { textContent: styles },
    isolateEvents: true,
  })

  if (outerStyles) {
    Object.assign(parentElement.style, outerStyles)
  }

  const btn = document.createElement('button') as HTMLButtonElement
  btn.className = [
    colorClass,
    'text-white',
    'text-xs',
    'font-semibold',
    'px-3',
    'h-8',
    'rounded-md',
    'cursor-pointer',
    'border-0',
    'shrink-0',
    'disabled:opacity-70',
    'disabled:cursor-not-allowed',
  ].join(' ')
  btn.textContent = label
  isolatedElement.appendChild(btn)

  return { parentElement, button: btn }
}
