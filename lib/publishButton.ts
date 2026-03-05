import { createIsolatedElement } from '@webext-core/isolated-element'

export interface PublishButtonConfig {
  accentColor: string
  label?: string
  /** Styles applied to the outer host element (e.g. for absolute positioning) */
  outerStyles?: Partial<CSSStyleDeclaration>
}

export async function createPublishButton(config: PublishButtonConfig): Promise<{
  parentElement: HTMLElement
  button: HTMLButtonElement
}> {
  const { accentColor, label = 'Publish', outerStyles } = config

  const { parentElement, isolatedElement } = await createIsolatedElement({
    name: 'dc-publish-btn',
    css: {
      textContent: `
        button {
          padding: 4px 10px;
          height: 32px;
          background: ${accentColor};
          color: #fff;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-family: sans-serif;
          font-weight: 600;
          flex-shrink: 0;
          line-height: 1;
        }
        button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `,
    },
    isolateEvents: true,
  })

  if (outerStyles) {
    Object.assign(parentElement.style, outerStyles)
  }

  const btn = document.createElement('button') as HTMLButtonElement
  btn.textContent = label
  isolatedElement.appendChild(btn)

  return { parentElement, button: btn }
}
