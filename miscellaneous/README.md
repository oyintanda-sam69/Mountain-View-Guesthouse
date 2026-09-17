# Mountain View Guesthouse & Lodge — Website

A responsive, multi-page marketing website for a fictional Karoo guesthouse,
built for the WEDE5020 / WEBE5020 web design module (Part 1: Proposal & HTML
structure, Part 2: CSS styling and responsive design).

**Live pages:** `index.html` (Home), `pages/about.html`, `pages/accommodation.html`,
`pages/things-to-do.html`, `pages/contact.html`.

---

## 1. Project Overview

Mountain View Guesthouse and Lodge is a nine-room, family-run Cape Dutch
guesthouse in Somerset East, Eastern Cape, positioned as a stopover on the
N10 between Gqeberha and Graaff-Reinet, and a base for hikers, anglers and
birdwatchers exploring the Boschberg Mountain area.

The site was designed to:

- Present the guesthouse's story, rooms and rates clearly to travellers
  researching a stopover or short break.
- Convert visitors into enquiries via a booking enquiry form.
- Work well on desktop, tablet and mobile screens.
- Follow semantic HTML5 and accessible markup practices.

## 2. Folder / File Structure

```
Mountain view Guesthouse/
├── index.html                  # Home page
├── README.md                   # This file
├── pages/
│   ├── about.html               # Our story, timeline, mission & vision
│   ├── accommodation.html       # Room listings, rates table, house policies
│   ├── things-to-do.html        # Filterable local activities
│   └── contact.html             # Contact details + booking enquiry form + map
├── assets/
│   ├── css/
│   │   └── style.css            # Single external stylesheet for the whole site
│   ├── js/
│   │   └── script.js            # Mobile nav toggle, tab filter, form validation
│   └── images/                  # Photography, logo, and generated responsive
│                                 # image variants (see "Responsive Images" below)
└── miscellaneous/
    └── README.md                 # Deprecated — superseded by this file
```

## 3. Site Map

```
Home (index.html)
 ├── About Us (pages/about.html)
 ├── Accommodation (pages/accommodation.html)
 ├── Things to Do (pages/things-to-do.html)
 └── Contact / Enquire (pages/contact.html)
```

Every page shares the same header navigation and footer, so all five pages
are reachable from anywhere on the site in a single click.

## 4. Technology Used

| Layer       | Choice                                                        |
|-------------|----------------------------------------------------------------|
| Markup      | Semantic HTML5 (`header`, `nav`, `main`, `section`, `article`, `figure`, `address`, `blockquote`, `table`) |
| Styling     | A single external stylesheet, CSS custom properties, Flexbox and CSS Grid, no framework |
| Typography  | Google Fonts — Playfair Display (headings) and Lato (body text) |
| Interactivity | Vanilla JavaScript (no libraries) for the mobile nav toggle, the Things to Do tab filter, and enquiry form validation |
| Images      | Real guesthouse photography, served responsively with `srcset`/`sizes` |
| Hosting     | Static site — can be hosted on GitHub Pages or any static file host |

No build tools, frameworks or package managers are required — the site runs
by opening `index.html` in a browser, or by serving the folder with any
static file server.

## 5. Responsive Design

The stylesheet is organised desktop-first, with three breakpoints layered on
top of the base rules in `assets/css/style.css`:

| Breakpoint       | Target device        | Key changes |
|------------------|-----------------------|-------------|
| `max-width: 1024px` | Tablet (landscape)  | Feature/testimonial grids drop from 3 to 2 columns |
| `max-width: 768px`  | Tablet (portrait) / large phone | Layout switches to a single column, the hamburger menu appears, room cards stack image-over-text |
| `max-width: 480px`  | Small phone          | Buttons become full-width, spacing tightens further |

Relative units (`rem`, `em`, `%`, `vw`, `clamp()`) are used throughout for
font sizes, spacing and widths so that text and layout scale smoothly
between breakpoints rather than jumping.

### Responsive Images

The homepage hero, the "Our Story" photo, and several interior images use
the `srcset`/`sizes` attributes so the browser can download a smaller file
on a small screen instead of the full-size original:

```html
<img
  src="assets/images/"
  alt="Sunrise over the Boschberg mountain range near Somerset East">
```

The smaller variants (`-400w`, `-600w`, `-900w`, etc.) were generated from
the original photographs specifically for this project.

### Testing

The layout was checked in the browser's device toolbar (Chrome DevTools)
at the following representative widths, matching the breakpoints above:

- **Desktop:** 1440px and 1280px
- **Tablet:** 1024px (landscape) and 768px (portrait)
- **Mobile:** 414px and 375px

## 6. Accessibility Notes

- A "Skip to main content" link is provided for keyboard users.
- All navigation links use `aria-current="page"` on the active page.
- The mobile menu button uses `aria-expanded` and `aria-controls`.
- Form fields all have associated `<label>` elements and `required`
  attributes where appropriate.
- Images use descriptive `alt` text; decorative icons are marked
  `aria-hidden="true"`.
- Colour combinations were chosen to maintain sufficient contrast against
  both the cream and dark backgrounds used across the site.

## 7. Known Limitations

- The enquiry form does not send real email — it performs client-side
  validation only. A production deployment would post to a small PHP
  script or a service such as Formspree, as noted in the code comments in
  `assets/js/script.js`.
- Room rates are indicative placeholder figures for the purposes of this
  student project.

---

## 8. Changelog

All notable changes to this project are recorded here, from oldest to
newest, as required by the module's documentation guidelines.

### v1.0 — Initial Part 1 submission
- Initial HTML structure created for Home, About, Accommodation, Things to
  Do, Contact and Enquiry pages.
- Basic file/folder structure established (`assets/`, `pages/`).

### v2.0 — Part 2 corrections and full redesign (this submission)
Implemented in response to Part 1 marking feedback:

- **Fixed broken home-page navigation link.** Pages inside `pages/` were
  linking to `index.html` (which does not exist relative to that folder)
  instead of `../index.html`. All internal links were audited and
  corrected across every page.
- **Fixed broken image and stylesheet paths.** Pages referenced a
  non-existent `images/logo.png` and a stylesheet at `styles.css`; both
  now correctly resolve to `../assets/images/logo.webp` and
  `../assets/css/style.css`.
- **Wrote the external stylesheet from scratch.** `assets/css/style.css`
  was previously an empty file; the site had no visual design at all. It
  now contains the full design system (colour tokens, typography scale,
  layout, components and responsive breakpoints) matching the approved
  design mock-ups.
- **Renamed `things to do.html` to `things-to-do.html`** to remove the
  space in the filename, which is unsafe in URLs, and updated every link
  site-wide.
- **Merged `contact.html` and `enquiry.html` into a single
  `pages/contact.html`** page, matching the single "Contact / Enquire"
  navigation item in the approved design and removing a duplicate,
  inconsistently-styled page.
- **Fixed invalid HTML** in the old contact page (missing closing
  `</html>` tag, a stray `>` character sitting outside any tag).
- **Added a full rates table** (`<table>` with `<caption>`, `<thead>`,
  `scope="col"`) on the Accommodation page, addressing the "sufficient
  content" and "content tags" feedback.
- **Expanded content throughout**: added a 15-year timeline on the About
  page, six "Why Stay With Us" feature cards and three guest testimonials
  on the Home page, four full room listings with amenities lists on the
  Accommodation page, and eight categorised activity cards with a working
  tab filter on the Things to Do page.
- **Added extensive HTML and CSS comments** explaining the purpose of each
  section, addressing the "insufficient use of comments" feedback.
- **Implemented responsive design**: CSS Grid/Flexbox layout, three media
  query breakpoints (1024px / 768px / 480px), relative units throughout,
  and `srcset`/`sizes` responsive images on key photographs.
- **Added a mobile navigation toggle** (hamburger menu) with proper ARIA
  attributes, since the previous site had no mobile navigation at all.
- **Rewrote this README** with full project documentation, a site map, a
  changelog and a references section (previously the README contained only
  the single line `# mywebsite3.0`).

---

## 9. References

Code, design and content references used while building this site:

- Independent Institute of Education (IIE). (2026). *WEBE5020 Part 2 —
  Designing the Visuals: CSS Styling and Responsive Design* [Module task
  brief]. The Independent Institute of Education (Pty) Ltd.
- Mozilla Developer Network (MDN). (n.d.). *CSS Grid Layout*. Retrieved
  from https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout
- Mozilla Developer Network (MDN). (n.d.). *Responsive images*. Retrieved
  from https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images
- Mozilla Developer Network (MDN). (n.d.). *Using CSS custom properties
  (variables)*. Retrieved from
  https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties
- W3C Web Accessibility Initiative (WAI). (n.d.). *ARIA Authoring
  Practices Guide*. Retrieved from https://www.w3.org/WAI/ARIA/apg/
- Google Fonts. (n.d.). *Playfair Display* and *Lato* typefaces. Retrieved
  from https://fonts.google.com/
- Photography: property and room photographs supplied by the guesthouse
  brand assets provided for this project.
- Somerset East / Boschberg / Blue Crane Route background information is
  fictionalised for the purposes of this student project and should not be
  treated as factual travel advice.

---