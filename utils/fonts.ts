// Font loading utility for browser extension
import browser from 'webextension-polyfill'

/**
 * Dynamically inject Poppins font-face declarations with correct extension URLs
 */
export function loadPoppinsFonts() {
  // Check if fonts are already loaded
  if (document.getElementById('poppins-fonts-style')) {
    return
  }

  const fontVariants = [
    { name: 'Poppins-Thin.ttf', weight: 100, style: 'normal' },
    { name: 'Poppins-ThinItalic.ttf', weight: 100, style: 'italic' },
    { name: 'Poppins-ExtraLight.ttf', weight: 200, style: 'normal' },
    { name: 'Poppins-ExtraLightItalic.ttf', weight: 200, style: 'italic' },
    { name: 'Poppins-Light.ttf', weight: 300, style: 'normal' },
    { name: 'Poppins-LightItalic.ttf', weight: 300, style: 'italic' },
    { name: 'Poppins-Regular.ttf', weight: 400, style: 'normal' },
    { name: 'Poppins-Italic.ttf', weight: 400, style: 'italic' },
    { name: 'Poppins-Medium.ttf', weight: 500, style: 'normal' },
    { name: 'Poppins-MediumItalic.ttf', weight: 500, style: 'italic' },
    { name: 'Poppins-SemiBold.ttf', weight: 600, style: 'normal' },
    { name: 'Poppins-SemiBoldItalic.ttf', weight: 600, style: 'italic' },
    { name: 'Poppins-Bold.ttf', weight: 700, style: 'normal' },
    { name: 'Poppins-BoldItalic.ttf', weight: 700, style: 'italic' },
    { name: 'Poppins-ExtraBold.ttf', weight: 800, style: 'normal' },
    { name: 'Poppins-ExtraBoldItalic.ttf', weight: 800, style: 'italic' },
    { name: 'Poppins-Black.ttf', weight: 900, style: 'normal' },
    { name: 'Poppins-BlackItalic.ttf', weight: 900, style: 'italic' },
  ]

  // Generate @font-face rules with correct extension URLs
  const fontFaceRules = fontVariants.map(variant => {
    const url = browser.runtime.getURL(`Poppins/${variant.name}`)
    return `
      @font-face {
        font-family: 'Poppins';
        src: url('${url}') format('truetype');
        font-weight: ${variant.weight};
        font-style: ${variant.style};
        font-display: swap;
      }
    `
  }).join('\n')

  // Add global font-family rule for body and common elements
  const globalFontRule = `
    body, html, input, textarea, select, button {
      font-family: 'Poppins', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }
  `

  // Create and inject style element
  const styleElement = document.createElement('style')
  styleElement.id = 'poppins-fonts-style'
  styleElement.textContent = fontFaceRules + globalFontRule
  document.head.appendChild(styleElement)

  console.log('✅ Poppins fonts loaded successfully')
}

