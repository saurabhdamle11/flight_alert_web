// <site-footer class="footer"></site-footer> — footer links shared by every page.
// The link list is FOOTER_LINKS in config.js; the current page is highlighted.

import { FOOTER_LINKS } from '../config.js';

const pageKey = (path) => path.replace(/\.html$/, '').replace(/\/index$/, '/');

class SiteFooter extends HTMLElement {
  connectedCallback() {
    const nav = document.createElement('nav');
    nav.className = 'footer-nav';
    nav.setAttribute('aria-label', 'Site');
    const here = pageKey(location.pathname);
    for (const { href, label } of FOOTER_LINKS) {
      const a = document.createElement('a');
      a.href = href;
      a.textContent = label;
      if (pageKey(href) === here) a.setAttribute('aria-current', 'page');
      nav.append(a);
    }
    this.replaceChildren(nav);
  }
}

customElements.define('site-footer', SiteFooter);
