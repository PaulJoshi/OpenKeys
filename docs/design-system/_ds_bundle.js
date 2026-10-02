/* @ds-bundle: {"format":4,"namespace":"OpenKeysDesignSystem_dedd02","components":[{"name":"Badge","sourcePath":"components/badges/Badge.jsx"},{"name":"SwatchDot","sourcePath":"components/badges/SwatchDot.jsx"},{"name":"Button","sourcePath":"components/buttons/Button.jsx"},{"name":"FilterChip","sourcePath":"components/buttons/FilterChip.jsx"},{"name":"IconButton","sourcePath":"components/buttons/IconButton.jsx"},{"name":"BenefitCard","sourcePath":"components/cards/BenefitCard.jsx"},{"name":"CampaignTile","sourcePath":"components/cards/CampaignTile.jsx"},{"name":"CategoryIconCard","sourcePath":"components/cards/CategoryIconCard.jsx"},{"name":"SongCard","sourcePath":"components/cards/SongCard.jsx"},{"name":"ICON_NAMES","sourcePath":"components/core/Icon.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"PianoKeyboard","sourcePath":"components/core/PianoKeyboard.jsx"},{"name":"DisclosureRow","sourcePath":"components/disclosure/DisclosureRow.jsx"},{"name":"SearchPill","sourcePath":"components/forms/SearchPill.jsx"},{"name":"FilterSidebar","sourcePath":"components/navigation/FilterSidebar.jsx"},{"name":"Footer","sourcePath":"components/navigation/Footer.jsx"},{"name":"PrimaryNav","sourcePath":"components/navigation/PrimaryNav.jsx"},{"name":"SubNav","sourcePath":"components/navigation/SubNav.jsx"},{"name":"UtilityBar","sourcePath":"components/navigation/UtilityBar.jsx"}],"sourceHashes":{"components/badges/Badge.jsx":"a2481f6af1bb","components/badges/SwatchDot.jsx":"00f08e8a3d93","components/buttons/Button.jsx":"3819953a4d0b","components/buttons/FilterChip.jsx":"eb6f091f4f84","components/buttons/IconButton.jsx":"db4225f66b68","components/cards/BenefitCard.jsx":"46527d3f5907","components/cards/CampaignTile.jsx":"1d0a9db46805","components/cards/CategoryIconCard.jsx":"868aa67e613d","components/cards/SongCard.jsx":"d71e5f5fa799","components/core/Icon.jsx":"d32e89df3ed7","components/core/PianoKeyboard.jsx":"317602d2c370","components/disclosure/DisclosureRow.jsx":"5c4fb7d6627e","components/forms/SearchPill.jsx":"245fe499f1e0","components/navigation/FilterSidebar.jsx":"c0e527045115","components/navigation/Footer.jsx":"60b0634eb457","components/navigation/PrimaryNav.jsx":"a592f469f341","components/navigation/SubNav.jsx":"f4c0b3001f03","components/navigation/UtilityBar.jsx":"aec348fdac5f","ui_kits/app/HomeScreen.jsx":"20787e53bca0","ui_kits/app/LibraryScreen.jsx":"711487e8cf50","ui_kits/app/PlayerScreen.jsx":"80a915d1788e","ui_kits/app/Shared.jsx":"43dfe2ed2ecf","ui_kits/app/SongScreen.jsx":"0d84dc1e95ed","ui_kits/app/data.js":"0f3fcf60a292","ui_kits/website/HomePage.jsx":"e521e117711c","ui_kits/website/SiteChrome.jsx":"b3b0125441c0","ui_kits/website/WhyPage.jsx":"a022bda1059e"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.OpenKeysDesignSystem_dedd02 = window.OpenKeysDesignSystem_dedd02 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/badges/Badge.jsx
try { (() => {
function Badge({
  variant = 'promo',
  children,
  style
}) {
  if (variant === 'promo') {
    return /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 12px',
        borderRadius: 'var(--radius-button)',
        background: 'var(--ok-white)',
        border: '1px solid var(--ok-hairline)',
        color: 'var(--ok-ink)',
        fontFamily: 'var(--font-sans)',
        fontWeight: 'var(--weight-medium)',
        fontSize: 'var(--type-caption-sm-size)',
        lineHeight: 'var(--type-caption-sm-lh)',
        whiteSpace: 'nowrap',
        ...style
      }
    }, children);
  }
  const color = variant === 'error' ? 'var(--ok-red)' : variant === 'success' ? 'var(--ok-green)' : 'var(--ok-mute)';
  return /*#__PURE__*/React.createElement("span", {
    style: {
      color,
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--type-caption-md-size)',
      lineHeight: 'var(--type-caption-md-lh)',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/badges/Badge.jsx", error: String((e && e.message) || e) }); }

// components/badges/SwatchDot.jsx
try { (() => {
const LIGHT = /^(#fff|#ffffff|white|#f5f5f5|var\(--ok-white\)|var\(--ok-soft-cloud\))$/i;
function SwatchDot({
  color = 'var(--ok-ink)',
  active = false,
  size = 12,
  label,
  onClick,
  style
}) {
  const ring = active ? '0 0 0 2px var(--ok-white), 0 0 0 4px var(--ok-ink)' : LIGHT.test(color) ? '0 0 0 1px var(--ok-hairline)' : 'none';
  const Tag = onClick ? 'button' : 'span';
  return /*#__PURE__*/React.createElement(Tag, {
    type: onClick ? 'button' : undefined,
    "aria-label": label,
    title: label,
    "aria-pressed": onClick ? active : undefined,
    onClick: onClick,
    style: {
      display: 'inline-block',
      width: size,
      height: size,
      padding: 0,
      border: 0,
      flex: 'none',
      borderRadius: 'var(--radius-full)',
      background: color,
      boxShadow: ring,
      cursor: onClick ? 'pointer' : 'default',
      ...style
    }
  });
}
Object.assign(__ds_scope, { SwatchDot });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/badges/SwatchDot.jsx", error: String((e && e.message) || e) }); }

// components/buttons/FilterChip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function FilterChip({
  active = false,
  count,
  children,
  onClick,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-pressed": active,
    onClick: onClick,
    className: "ok-press",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      boxSizing: 'border-box',
      height: 40,
      padding: '8px 16px',
      borderRadius: 'var(--radius-button)',
      border: '1px solid ' + (active ? 'var(--ok-ink)' : 'var(--ok-hairline)'),
      background: active ? 'var(--ok-ink)' : 'var(--ok-white)',
      color: active ? 'var(--ok-white)' : 'var(--ok-ink)',
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--type-button-md-size)',
      lineHeight: 'var(--type-button-md-lh)',
      whiteSpace: 'nowrap',
      cursor: 'pointer',
      ...style
    }
  }, rest), children, count != null ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: active ? 'var(--ok-stone)' : 'var(--ok-mute)'
    }
  }, "(", count, ")") : null);
}
Object.assign(__ds_scope, { FilterChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/buttons/FilterChip.jsx", error: String((e && e.message) || e) }); }

// components/cards/SongCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function SongCard({
  title,
  subtitle,
  meta,
  metaVariant,
  badge,
  swatches,
  image,
  media,
  aspectRatio = '1 / 1',
  onClick,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      background: 'var(--ok-white)',
      borderRadius: 0,
      cursor: onClick ? 'pointer' : 'default',
      minWidth: 0,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      aspectRatio,
      background: 'var(--ok-soft-cloud)',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, image ? /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: "",
    style: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block'
    }
  }) : media, badge ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 12,
      left: 12
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Badge, null, badge)) : null), swatches && swatches.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      padding: '2px 2px 0'
    }
  }, swatches.map((s, i) => /*#__PURE__*/React.createElement(__ds_scope.SwatchDot, _extends({
    key: i
  }, s)))) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--type-body-size)',
      lineHeight: 'var(--type-body-lh)',
      color: 'var(--ok-ink)'
    }
  }, title), subtitle ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--type-caption-md-size)',
      lineHeight: 'var(--type-caption-md-lh)',
      color: 'var(--ok-mute)'
    }
  }, subtitle) : null), meta ? metaVariant ? /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    variant: metaVariant
  }, meta) : /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--type-body-size)',
      lineHeight: 'var(--type-body-lh)',
      color: 'var(--ok-ink)'
    }
  }, meta) : null);
}
Object.assign(__ds_scope, { SongCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/SongCard.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
// Lucide icon paths (lucide-static@0.460.0, ISC). Copied programmatically; mirrors assets/icons/*.svg.
const ICONS = {
  "search": "<circle cx=\"11\" cy=\"11\" r=\"8\" /> <path d=\"m21 21-4.3-4.3\" />",
  "heart": "<path d=\"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z\" />",
  "chevron-down": "<path d=\"m6 9 6 6 6-6\" />",
  "chevron-right": "<path d=\"m9 18 6-6-6-6\" />",
  "chevron-left": "<path d=\"m15 18-6-6 6-6\" />",
  "chevron-up": "<path d=\"m18 15-6-6-6 6\" />",
  "arrow-left": "<path d=\"m12 19-7-7 7-7\" /> <path d=\"M19 12H5\" />",
  "arrow-right": "<path d=\"M5 12h14\" /> <path d=\"m12 5 7 7-7 7\" />",
  "play": "<polygon points=\"6 3 20 12 6 21 6 3\" />",
  "pause": "<rect x=\"14\" y=\"4\" width=\"4\" height=\"16\" rx=\"1\" /> <rect x=\"6\" y=\"4\" width=\"4\" height=\"16\" rx=\"1\" />",
  "menu": "<line x1=\"4\" x2=\"20\" y1=\"12\" y2=\"12\" /> <line x1=\"4\" x2=\"20\" y1=\"6\" y2=\"6\" /> <line x1=\"4\" x2=\"20\" y1=\"18\" y2=\"18\" />",
  "x": "<path d=\"M18 6 6 18\" /> <path d=\"m6 6 12 12\" />",
  "check": "<path d=\"M20 6 9 17l-5-5\" />",
  "sliders-horizontal": "<line x1=\"21\" x2=\"14\" y1=\"4\" y2=\"4\" /> <line x1=\"10\" x2=\"3\" y1=\"4\" y2=\"4\" /> <line x1=\"21\" x2=\"12\" y1=\"12\" y2=\"12\" /> <line x1=\"8\" x2=\"3\" y1=\"12\" y2=\"12\" /> <line x1=\"21\" x2=\"16\" y1=\"20\" y2=\"20\" /> <line x1=\"12\" x2=\"3\" y1=\"20\" y2=\"20\" /> <line x1=\"14\" x2=\"14\" y1=\"2\" y2=\"6\" /> <line x1=\"8\" x2=\"8\" y1=\"10\" y2=\"14\" /> <line x1=\"16\" x2=\"16\" y1=\"18\" y2=\"22\" />",
  "music": "<path d=\"M9 18V5l12-2v13\" /> <circle cx=\"6\" cy=\"18\" r=\"3\" /> <circle cx=\"18\" cy=\"16\" r=\"3\" />",
  "piano": "<path d=\"M18.5 8c-1.4 0-2.6-.8-3.2-2A6.87 6.87 0 0 0 2 9v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8.5C22 9.6 20.4 8 18.5 8\" /> <path d=\"M2 14h20\" /> <path d=\"M6 14v4\" /> <path d=\"M10 14v4\" /> <path d=\"M14 14v4\" /> <path d=\"M18 14v4\" />",
  "github": "<path d=\"M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4\" /> <path d=\"M9 18c-4.51 2-5-2-7-2\" />",
  "share-2": "<circle cx=\"18\" cy=\"5\" r=\"3\" /> <circle cx=\"6\" cy=\"12\" r=\"3\" /> <circle cx=\"18\" cy=\"19\" r=\"3\" /> <line x1=\"8.59\" x2=\"15.42\" y1=\"13.51\" y2=\"17.49\" /> <line x1=\"15.41\" x2=\"8.59\" y1=\"6.51\" y2=\"10.49\" />",
  "user": "<path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\" /> <circle cx=\"12\" cy=\"7\" r=\"4\" />",
  "house": "<path d=\"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8\" /> <path d=\"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\" />",
  "library": "<path d=\"m16 6 4 14\" /> <path d=\"M12 6v14\" /> <path d=\"M8 8v12\" /> <path d=\"M4 4v16\" />",
  "trophy": "<path d=\"M6 9H4.5a2.5 2.5 0 0 1 0-5H6\" /> <path d=\"M18 9h1.5a2.5 2.5 0 0 0 0-5H18\" /> <path d=\"M4 22h16\" /> <path d=\"M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22\" /> <path d=\"M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22\" /> <path d=\"M18 2H6v7a6 6 0 0 0 12 0V2Z\" />",
  "flame": "<path d=\"M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z\" />",
  "clock": "<circle cx=\"12\" cy=\"12\" r=\"10\" /> <polyline points=\"12 6 12 12 16 14\" />",
  "volume-2": "<path d=\"M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z\" /> <path d=\"M16 9a5 5 0 0 1 0 6\" /> <path d=\"M19.364 18.364a9 9 0 0 0 0-12.728\" />",
  "settings": "<path d=\"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z\" /> <circle cx=\"12\" cy=\"12\" r=\"3\" />",
  "rotate-ccw": "<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\" /> <path d=\"M3 3v5h5\" />",
  "timer": "<line x1=\"10\" x2=\"14\" y1=\"2\" y2=\"2\" /> <line x1=\"12\" x2=\"15\" y1=\"14\" y2=\"11\" /> <circle cx=\"12\" cy=\"14\" r=\"8\" />",
  "list-music": "<path d=\"M21 15V6\" /> <path d=\"M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z\" /> <path d=\"M12 12H3\" /> <path d=\"M16 6H3\" /> <path d=\"M12 18H3\" />",
  "book-open": "<path d=\"M12 7v14\" /> <path d=\"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z\" />",
  "star": "<path d=\"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z\" />",
  "plus": "<path d=\"M5 12h14\" /> <path d=\"M12 5v14\" />",
  "minus": "<path d=\"M5 12h14\" />",
  "circle-check": "<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"m9 12 2 2 4-4\" />",
  "download": "<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\" /> <polyline points=\"7 10 12 15 17 10\" /> <line x1=\"12\" x2=\"12\" y1=\"15\" y2=\"3\" />",
  "globe": "<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20\" /> <path d=\"M2 12h20\" />",
  "hand": "<path d=\"M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2\" /> <path d=\"M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2\" /> <path d=\"M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8\" /> <path d=\"M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15\" />",
  "keyboard": "<path d=\"M10 8h.01\" /> <path d=\"M12 12h.01\" /> <path d=\"M14 8h.01\" /> <path d=\"M16 12h.01\" /> <path d=\"M18 8h.01\" /> <path d=\"M6 8h.01\" /> <path d=\"M7 16h10\" /> <path d=\"M8 12h.01\" /> <rect width=\"20\" height=\"16\" x=\"2\" y=\"4\" rx=\"2\" />",
  "skip-back": "<polygon points=\"19 20 9 12 19 4 19 20\" /> <line x1=\"5\" x2=\"5\" y1=\"19\" y2=\"5\" />",
  "skip-forward": "<polygon points=\"5 4 15 12 5 20 5 4\" /> <line x1=\"19\" x2=\"19\" y1=\"5\" y2=\"19\" />",
  "repeat": "<path d=\"m17 2 4 4-4 4\" /> <path d=\"M3 11v-1a4 4 0 0 1 4-4h14\" /> <path d=\"m7 22-4-4 4-4\" /> <path d=\"M21 13v1a4 4 0 0 1-4 4H3\" />",
  "chart-no-axes-column": "<line x1=\"18\" x2=\"18\" y1=\"20\" y2=\"10\" /> <line x1=\"12\" x2=\"12\" y1=\"20\" y2=\"4\" /> <line x1=\"6\" x2=\"6\" y1=\"20\" y2=\"14\" />",
  "headphones": "<path d=\"M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3\" />",
  "award": "<path d=\"m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526\" /> <circle cx=\"12\" cy=\"8\" r=\"6\" />",
  "code": "<polyline points=\"16 18 22 12 16 6\" /> <polyline points=\"8 6 2 12 8 18\" />",
  "shopping-bag": "<path d=\"M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z\" /> <path d=\"M3 6h18\" /> <path d=\"M16 10a4 4 0 0 1-8 0\" />",
  "sparkles": "<path d=\"M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z\" /> <path d=\"M20 3v4\" /> <path d=\"M22 5h-4\" /> <path d=\"M4 17v2\" /> <path d=\"M5 18H3\" />",
  "gauge": "<path d=\"m12 14 4-4\" /> <path d=\"M3.34 19a10 10 0 1 1 17.32 0\" />",
  "eye": "<path d=\"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0\" /> <circle cx=\"12\" cy=\"12\" r=\"3\" />",
  "graduation-cap": "<path d=\"M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z\" /> <path d=\"M22 10v6\" /> <path d=\"M6 12.5V16a6 3 0 0 0 12 0v-3.5\" />"
};
const ICON_NAMES = Object.keys(ICONS);
function Icon({
  name,
  size = 24,
  strokeWidth = 2,
  color = 'currentColor',
  style,
  ...rest
}) {
  const inner = ICONS[name];
  if (!inner) return null;
  return React.createElement('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    style: {
      display: 'block',
      flexShrink: 0,
      ...style
    },
    dangerouslySetInnerHTML: {
      __html: inner
    },
    ...rest
  });
}
Object.assign(__ds_scope, { ICON_NAMES, Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/buttons/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    padding: '8px 16px',
    fontSize: 'var(--type-button-sm-size)',
    lineHeight: 'var(--type-button-sm-lh)',
    icon: 16
  },
  md: {
    padding: '12px 32px',
    fontSize: 'var(--type-button-md-size)',
    lineHeight: 'var(--type-button-md-lh)',
    icon: 20,
    height: 48
  },
  lg: {
    padding: '16px 32px',
    fontSize: 'var(--type-button-lg-size)',
    lineHeight: 'var(--type-button-lg-lh)',
    icon: 24
  }
};
const VARIANTS = {
  primary: {
    background: 'var(--ok-ink)',
    color: 'var(--ok-white)'
  },
  secondary: {
    background: 'var(--ok-soft-cloud)',
    color: 'var(--ok-ink)'
  },
  onImage: {
    background: 'var(--ok-white)',
    color: 'var(--ok-ink)'
  }
};
function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  fullWidth = false,
  disabled = false,
  children,
  onClick,
  type = 'button',
  style,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;
  const pad = variant === 'onImage' && size === 'md' ? '12px 24px' : s.padding;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    className: disabled ? undefined : 'ok-press',
    style: {
      display: fullWidth ? 'flex' : 'inline-flex',
      width: fullWidth ? '100%' : undefined,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      boxSizing: 'border-box',
      height: s.height,
      padding: pad,
      border: 0,
      borderRadius: 'var(--radius-button)',
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-medium)',
      fontSize: s.fontSize,
      lineHeight: s.lineHeight,
      whiteSpace: 'nowrap',
      cursor: disabled ? 'not-allowed' : 'pointer',
      ...v,
      ...(disabled ? {
        background: 'var(--ok-hairline-soft)',
        color: 'var(--ok-stone)'
      } : null),
      ...style
    }
  }, rest), icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: s.icon
  }) : null, children, iconRight ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: s.icon
  }) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/buttons/Button.jsx", error: String((e && e.message) || e) }); }

// components/buttons/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const VARIANTS = {
  soft: {
    background: 'var(--ok-soft-cloud)',
    color: 'var(--ok-ink)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--ok-ink)'
  },
  onImage: {
    background: 'var(--ok-white)',
    color: 'var(--ok-ink)'
  },
  inverse: {
    background: 'var(--ok-ink)',
    color: 'var(--ok-white)'
  }
};
function IconButton({
  icon,
  label,
  variant = 'soft',
  size = 40,
  iconSize,
  onClick,
  disabled = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    title: label,
    onClick: onClick,
    disabled: disabled,
    className: disabled ? undefined : 'ok-press',
    style: {
      width: size,
      height: size,
      flex: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 0,
      border: 0,
      borderRadius: 'var(--radius-full)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
      ...(VARIANTS[variant] || VARIANTS.soft),
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: iconSize || Math.round(size * 0.5)
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/buttons/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/cards/BenefitCard.jsx
try { (() => {
function BenefitCard({
  title,
  cta = 'Explore',
  onCta,
  image,
  background = 'var(--ok-ink)',
  height = 400,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height,
      background,
      overflow: 'hidden',
      borderRadius: 0,
      ...style
    }
  }, image ? /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: "",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : null, children, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 24,
      right: 24,
      bottom: 24,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--type-heading-lg-size)',
      lineHeight: 'var(--type-heading-lg-lh)',
      color: 'var(--ok-white)',
      textWrap: 'pretty'
    }
  }, title), cta ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "onImage",
    onClick: onCta
  }, cta) : null));
}
Object.assign(__ds_scope, { BenefitCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/BenefitCard.jsx", error: String((e && e.message) || e) }); }

// components/cards/CampaignTile.jsx
try { (() => {
function CampaignTile({
  headline,
  tone = 'light',
  image,
  background = 'var(--ok-ink)',
  cta,
  onCta,
  height = 520,
  displaySize = 96,
  children,
  style
}) {
  const lines = String(headline || '').split('\n');
  return /*#__PURE__*/React.createElement("section", {
    style: {
      position: 'relative',
      height,
      background,
      overflow: 'hidden',
      borderRadius: 0,
      ...style
    }
  }, image ? /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: "",
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    }
  }) : null, children, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: 48,
      right: 48,
      bottom: 48,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-medium)',
      fontSize: displaySize,
      lineHeight: 'var(--type-display-lh)',
      textTransform: 'uppercase',
      letterSpacing: 0,
      color: tone === 'light' ? 'var(--ok-white)' : 'var(--ok-ink)'
    }
  }, lines.map((l, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, l, i < lines.length - 1 ? /*#__PURE__*/React.createElement("br", null) : null))), cta ? /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "onImage",
    onClick: onCta
  }, cta) : null));
}
Object.assign(__ds_scope, { CampaignTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/CampaignTile.jsx", error: String((e && e.message) || e) }); }

// components/cards/CategoryIconCard.jsx
try { (() => {
function CategoryIconCard({
  icon,
  label,
  onClick,
  style
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    className: "ok-press",
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
      padding: '24px 8px',
      border: 0,
      borderRadius: 0,
      background: 'var(--ok-white)',
      color: 'var(--ok-ink)',
      cursor: 'pointer',
      minWidth: 0,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 80,
      height: 80,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 48,
    strokeWidth: 1.5
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--type-caption-md-size)',
      lineHeight: 'var(--type-caption-md-lh)'
    }
  }, label));
}
Object.assign(__ds_scope, { CategoryIconCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/CategoryIconCard.jsx", error: String((e && e.message) || e) }); }

// components/core/PianoKeyboard.jsx
try { (() => {
const WHITE = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_AFTER = {
  C: 'C#',
  D: 'D#',
  F: 'F#',
  G: 'G#',
  A: 'A#'
};
const STATE_FILL = {
  target: {
    white: 'var(--ok-blue)',
    black: 'var(--ok-blue)'
  },
  correct: {
    white: 'var(--ok-green)',
    black: 'var(--ok-green)'
  },
  wrong: {
    white: 'var(--ok-red)',
    black: 'var(--ok-red)'
  },
  pressed: {
    white: 'var(--ok-soft-cloud)',
    black: 'var(--ok-charcoal)'
  }
};
function PianoKeyboard({
  startOctave = 4,
  octaves = 2,
  keyStates = {},
  showLabels = 'c',
  height = 160,
  onKeyPress,
  style
}) {
  const [down, setDown] = React.useState(null);
  const whites = [];
  for (let o = 0; o < octaves; o++) WHITE.forEach(n => whites.push({
    note: n,
    octave: startOctave + o
  }));
  whites.push({
    note: 'C',
    octave: startOctave + octaves
  });
  const pct = 100 / whites.length;
  const stateOf = id => keyStates[id] || (down === id ? 'pressed' : null);
  const press = id => {
    setDown(id);
    onKeyPress && onKeyPress(id);
  };
  const up = () => setDown(null);
  return /*#__PURE__*/React.createElement("div", {
    role: "group",
    "aria-label": "Piano keyboard",
    onPointerUp: up,
    onPointerLeave: up,
    style: {
      position: 'relative',
      height,
      width: '100%',
      userSelect: 'none',
      touchAction: 'none',
      background: 'var(--ok-ink)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100%',
      gap: 1,
      paddingTop: 0
    }
  }, whites.map(({
    note,
    octave
  }) => {
    const id = note + octave;
    const s = stateOf(id);
    const fill = s ? STATE_FILL[s].white : 'var(--ok-white)';
    const onFill = s && s !== 'pressed';
    const label = showLabels === 'all' || showLabels === 'c' && note === 'C';
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      "aria-label": id,
      onPointerDown: () => press(id),
      style: {
        flex: 1,
        border: 0,
        padding: '0 0 10px',
        margin: 0,
        background: fill,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        font: '500 12px/1.5 var(--font-sans)',
        color: onFill ? 'var(--ok-white)' : 'var(--ok-mute)',
        transition: 'background var(--duration-fast) var(--ease-standard)'
      }
    }, label ? showLabels === 'all' ? note : id : '');
  })), whites.slice(0, -1).map(({
    note,
    octave
  }, i) => {
    const b = BLACK_AFTER[note];
    if (!b) return null;
    const id = b + octave;
    const s = stateOf(id);
    const fill = s ? STATE_FILL[s].black : 'var(--ok-ink)';
    return /*#__PURE__*/React.createElement("button", {
      key: id,
      "aria-label": id,
      onPointerDown: e => {
        e.stopPropagation();
        press(id);
      },
      style: {
        position: 'absolute',
        top: 0,
        left: 'calc(' + (i + 1) * pct + '% - ' + pct * 0.3 + '%)',
        width: pct * 0.6 + '%',
        height: '62%',
        border: 0,
        padding: 0,
        background: fill,
        cursor: 'pointer',
        boxShadow: '0 0 0 1px var(--ok-ink)',
        transition: 'background var(--duration-fast) var(--ease-standard)'
      }
    });
  }));
}
Object.assign(__ds_scope, { PianoKeyboard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/PianoKeyboard.jsx", error: String((e && e.message) || e) }); }

// components/disclosure/DisclosureRow.jsx
try { (() => {
function DisclosureRow({
  title,
  variant = 'detail',
  defaultOpen = false,
  open,
  onToggle,
  children,
  style
}) {
  const [inner, setInner] = React.useState(defaultOpen);
  const isOpen = open != null ? open : inner;
  const toggle = () => {
    if (open == null) setInner(!isOpen);
    onToggle && onToggle(!isOpen);
  };
  const faq = variant === 'faq';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderBottom: '1px solid var(--ok-hairline)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-expanded": isOpen,
    onClick: toggle,
    style: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      padding: '24px 0',
      border: 0,
      background: 'transparent',
      color: 'var(--ok-ink)',
      cursor: 'pointer',
      textAlign: 'left',
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-medium)',
      fontSize: 16,
      lineHeight: faq ? 'var(--type-heading-md-lh)' : 'var(--type-body-lh)'
    }
  }, /*#__PURE__*/React.createElement("span", null, title), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 24,
    style: {
      transform: isOpen ? 'rotate(180deg)' : 'none',
      transition: 'transform var(--duration-base) var(--ease-standard)'
    }
  })), isOpen ? /*#__PURE__*/React.createElement("div", {
    style: {
      paddingBottom: 24,
      fontSize: 'var(--type-body-size)',
      lineHeight: 'var(--type-body-lh)',
      color: 'var(--ok-ink)'
    }
  }, children) : null);
}
Object.assign(__ds_scope, { DisclosureRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/disclosure/DisclosureRow.jsx", error: String((e && e.message) || e) }); }

// components/forms/SearchPill.jsx
try { (() => {
function SearchPill({
  placeholder = 'Search',
  value,
  defaultValue,
  onChange,
  onSubmit,
  width = 180,
  autoFocus,
  style
}) {
  const [focused, setFocused] = React.useState(false);
  return /*#__PURE__*/React.createElement("form", {
    role: "search",
    onSubmit: e => {
      e.preventDefault();
      onSubmit && onSubmit(e.currentTarget.elements.q.value);
    },
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      boxSizing: 'border-box',
      height: 40,
      width,
      padding: focused ? '6px 14px' : '8px 16px',
      borderRadius: 'var(--radius-input)',
      background: focused ? 'var(--ok-white)' : 'var(--ok-soft-cloud)',
      border: focused ? '2px solid var(--ok-ink)' : 0,
      boxShadow: focused ? 'var(--focus-halo)' : 'none',
      transition: 'box-shadow var(--duration-base) var(--ease-standard)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "search",
    size: 20
  }), /*#__PURE__*/React.createElement("input", {
    name: "q",
    value: value,
    defaultValue: defaultValue,
    onChange: onChange,
    placeholder: placeholder,
    autoFocus: autoFocus,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      flex: 1,
      minWidth: 0,
      border: 0,
      outline: 0,
      background: 'transparent',
      padding: 0,
      color: 'var(--ok-ink)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-body-size)',
      lineHeight: 'var(--type-body-lh)',
      fontWeight: 'var(--weight-regular)'
    }
  }));
}
Object.assign(__ds_scope, { SearchPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SearchPill.jsx", error: String((e && e.message) || e) }); }

// components/navigation/FilterSidebar.jsx
try { (() => {
function FilterSidebar({
  groups = [],
  onToggle,
  width = 220,
  style
}) {
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width,
      flex: 'none',
      background: 'var(--ok-white)',
      display: 'flex',
      flexDirection: 'column',
      ...style
    }
  }, groups.map((g, gi) => /*#__PURE__*/React.createElement("div", {
    key: g.title,
    style: {
      borderTop: gi ? '1px solid var(--ok-hairline)' : 0,
      padding: '18px 0',
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--type-body-size)',
      lineHeight: 'var(--type-body-lh)'
    }
  }, g.title), g.options.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.label,
    type: "button",
    onClick: () => onToggle && onToggle(g.title, o.label),
    style: {
      alignSelf: 'flex-start',
      border: 0,
      background: 'transparent',
      padding: 0,
      cursor: 'pointer',
      color: 'var(--ok-ink)',
      textAlign: 'left',
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--type-body-size)',
      lineHeight: 'var(--type-body-lh)',
      textDecoration: o.active ? 'underline' : 'none',
      textDecorationThickness: 1,
      textUnderlineOffset: 4
    }
  }, o.label, o.count != null ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ok-mute)'
    }
  }, " (", o.count, ")") : null)))));
}
Object.assign(__ds_scope, { FilterSidebar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/FilterSidebar.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Footer.jsx
try { (() => {
function Footer({
  columns = [],
  legal = [],
  style
}) {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: 'var(--ok-white)',
      borderTop: '1px solid var(--ok-hairline)',
      padding: '48px var(--gutter-desktop) 24px',
      color: 'var(--ok-mute)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(' + Math.max(columns.length, 1) + ', minmax(0, 1fr))',
      gap: 24
    }
  }, columns.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.title,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--type-body-size)',
      lineHeight: 'var(--type-body-lh)',
      color: 'var(--ok-ink)'
    }
  }, c.title), c.links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    href: "#",
    style: {
      color: 'var(--ok-mute)',
      textDecoration: 'none',
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--type-caption-md-size)',
      lineHeight: 'var(--type-caption-md-lh)'
    }
  }, l))))), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--ok-hairline)',
      marginTop: 48,
      paddingTop: 12,
      display: 'flex',
      flexWrap: 'wrap',
      gap: 18,
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--type-utility-size)',
      lineHeight: 'var(--type-utility-lh)',
      color: 'var(--ok-mute)'
    }
  }, legal.map(l => /*#__PURE__*/React.createElement("span", {
    key: l
  }, l))));
}
Object.assign(__ds_scope, { Footer });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Footer.jsx", error: String((e && e.message) || e) }); }

// components/navigation/PrimaryNav.jsx
try { (() => {
function PrimaryNav({
  brand = 'OpenKeys',
  links = [],
  active,
  onNavigate,
  right,
  height = 56,
  style
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      height,
      background: 'var(--ok-white)',
      color: 'var(--ok-ink)',
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      gap: 24,
      padding: '0 var(--gutter-desktop)',
      boxSizing: 'border-box',
      ...style
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onNavigate && onNavigate('home');
    },
    style: {
      justifySelf: 'start',
      color: 'var(--ok-ink)',
      textDecoration: 'none',
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-medium)',
      fontSize: 20,
      lineHeight: 1,
      letterSpacing: '-0.01em'
    }
  }, brand), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      alignItems: 'stretch',
      gap: 24,
      height: '100%'
    }
  }, links.map(l => {
    const id = l.id || l.label;
    const on = id === active;
    return /*#__PURE__*/React.createElement("a", {
      key: id,
      href: "#",
      onClick: e => {
        e.preventDefault();
        onNavigate && onNavigate(id);
      },
      style: {
        display: 'flex',
        alignItems: 'center',
        color: 'var(--ok-ink)',
        textDecoration: 'none',
        fontWeight: 'var(--weight-medium)',
        fontSize: 'var(--type-body-size)',
        lineHeight: 'var(--type-body-lh)',
        boxShadow: on ? 'inset 0 -2px 0 var(--ok-ink)' : 'none',
        whiteSpace: 'nowrap'
      }
    }, l.label);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      justifySelf: 'end',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, right));
}
Object.assign(__ds_scope, { PrimaryNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/PrimaryNav.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SubNav.jsx
try { (() => {
const ctl = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  border: 0,
  background: 'transparent',
  padding: 0,
  cursor: 'pointer',
  color: 'var(--ok-ink)',
  fontFamily: 'var(--font-sans)',
  fontWeight: 'var(--weight-medium)',
  fontSize: 'var(--type-button-md-size)',
  lineHeight: 'var(--type-button-md-lh)'
};
function SubNav({
  breadcrumb = [],
  title,
  filtersHidden = false,
  onToggleFilters,
  sortLabel = 'Featured',
  onSort,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--ok-white)',
      boxShadow: 'var(--elevation-inset)',
      padding: '12px var(--gutter-desktop) 18px',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 24,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, breadcrumb.length ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--type-caption-md-size)',
      lineHeight: 'var(--type-caption-md-lh)',
      fontWeight: 'var(--weight-medium)',
      color: 'var(--ok-mute)'
    }
  }, breadcrumb.join(' / ')) : null, title ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--type-heading-lg-size)',
      lineHeight: 'var(--type-heading-lg-lh)',
      fontWeight: 'var(--weight-medium)'
    }
  }, title) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 24
    }
  }, onToggleFilters ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: ctl,
    onClick: onToggleFilters
  }, filtersHidden ? 'Show Filters' : 'Hide Filters', /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "sliders-horizontal",
    size: 20
  })) : null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: ctl,
    onClick: onSort
  }, "Sort By: ", sortLabel, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "chevron-down",
    size: 20
  }))));
}
Object.assign(__ds_scope, { SubNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SubNav.jsx", error: String((e && e.message) || e) }); }

// components/navigation/UtilityBar.jsx
try { (() => {
function UtilityBar({
  left,
  links = [],
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 'var(--nav-utility-h)',
      background: 'var(--ok-soft-cloud)',
      color: 'var(--ok-ink)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 var(--gutter-desktop)',
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--type-caption-sm-size)',
      lineHeight: 'var(--type-caption-sm-lh)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", null, left), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, links.map((l, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 1,
      height: 12,
      background: 'var(--ok-ink)'
    }
  }) : null, /*#__PURE__*/React.createElement("a", {
    href: l.href || '#',
    onClick: l.onClick,
    style: {
      color: 'inherit',
      textDecoration: 'none',
      fontWeight: 'inherit'
    }
  }, l.label)))));
}
Object.assign(__ds_scope, { UtilityBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/UtilityBar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/HomeScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function HomeScreen({
  go,
  openSong
}) {
  const {
    SongCard,
    CategoryIconCard,
    Button
  } = DS;
  const D = window.OK_DATA;
  const current = D.songs[1];
  return /*#__PURE__*/React.createElement("main", {
    style: {
      padding: '48px var(--gutter-desktop)',
      display: 'flex',
      flexDirection: 'column',
      gap: 48,
      maxWidth: 1440,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("section", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--ok-soft-cloud)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 320
    }
  }, /*#__PURE__*/React.createElement(KeysPreview, {
    notes: current.notes
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      gap: 18,
      padding: '0 0 0 40px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ok-caption-md",
    style: {
      color: 'var(--text-secondary)'
    }
  }, "Continue where you left off"), /*#__PURE__*/React.createElement("h1", {
    className: "ok-heading-xl",
    style: {
      margin: 0
    }
  }, current.title), /*#__PURE__*/React.createElement("div", {
    className: "ok-body",
    style: {
      color: 'var(--text-soft)'
    }
  }, current.composer, " \xB7 ", current.level, " \xB7 ", current.hands), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 2,
      background: 'var(--ok-hairline-soft)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: current.progress + '%',
      height: 2,
      background: 'var(--ok-ink)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "ok-caption-md"
  }, current.progress, "% complete"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    icon: "play",
    onClick: () => go('player', current.id)
  }, "Resume"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    onClick: () => openSong(current.id)
  }, "Details")))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Start with these",
    action: "All songs",
    onAction: () => go('library')
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0,1fr))',
      gap: 8
    }
  }, D.songs.filter(s => s.progress < 100).slice(1, 4).map(s => /*#__PURE__*/React.createElement(SongCard, _extends({
    key: s.id
  }, songCardProps(s, D), {
    onClick: () => openSong(s.id)
  }))))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(SectionHead, {
    title: "Browse by skill"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(6, minmax(0,1fr))',
      borderTop: '1px solid var(--ok-hairline)'
    }
  }, [['book-open', 'Reading notes'], ['hand', 'Hand position'], ['timer', 'Rhythm'], ['keyboard', 'Scales'], ['list-music', 'Chords'], ['music', 'Songs']].map(([i, l]) => /*#__PURE__*/React.createElement(CategoryIconCard, {
    key: l,
    icon: i,
    label: l,
    onClick: () => go('library')
  })))));
}
window.HomeScreen = HomeScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/LibraryScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function LibraryScreen({
  openSong
}) {
  const {
    SubNav,
    FilterSidebar,
    FilterChip,
    SongCard
  } = DS;
  const D = window.OK_DATA;
  const [hidden, setHidden] = React.useState(false);
  const [level, setLevel] = React.useState(null);
  const [genre, setGenre] = React.useState(null);
  const list = D.songs.filter(s => (!level || s.level === level) && (!genre || s.genre === genre));
  const count = (k, v) => D.songs.filter(s => s[k] === v).length;
  const groups = [{
    title: 'Level',
    options: ['Beginner', 'Intermediate'].map(v => ({
      label: v,
      count: count('level', v),
      active: level === v
    }))
  }, {
    title: 'Style',
    options: ['Classical', 'Folk', 'Jazz'].map(v => ({
      label: v,
      count: count('genre', v),
      active: genre === v
    }))
  }, {
    title: 'Hands',
    options: ['Right hand', 'Both hands'].map(v => ({
      label: v,
      count: count('hands', v)
    }))
  }];
  const toggle = (g, o) => {
    if (g === 'Level') setLevel(level === o ? null : o);
    if (g === 'Style') setGenre(genre === o ? null : o);
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SubNav, {
    breadcrumb: ['Songs', genre || 'All'],
    title: (genre || 'All songs') + ' (' + list.length + ')',
    filtersHidden: hidden,
    onToggleFilters: () => setHidden(!hidden)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 48,
      padding: '24px var(--gutter-desktop) 48px'
    }
  }, hidden ? null : /*#__PURE__*/React.createElement(FilterSidebar, {
    groups: groups,
    onToggle: toggle
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, ['Beginner', 'Intermediate'].map(l => /*#__PURE__*/React.createElement(FilterChip, {
    key: l,
    active: level === l,
    onClick: () => setLevel(level === l ? null : l)
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0,1fr))',
      gap: '48px 8px'
    }
  }, list.map(s => /*#__PURE__*/React.createElement(SongCard, _extends({
    key: s.id
  }, songCardProps(s, D), {
    onClick: () => openSong(s.id)
  })))))));
}
window.LibraryScreen = LibraryScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/LibraryScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/PlayerScreen.jsx
try { (() => {
function PlayerScreen({
  songId,
  go
}) {
  const {
    IconButton,
    Button,
    Badge,
    PianoKeyboard
  } = DS;
  const D = window.OK_DATA;
  const s = D.songs.find(x => x.id === songId) || D.songs[0];
  const [i, setI] = React.useState(0);
  const [wrong, setWrong] = React.useState(null);
  const [misses, setMisses] = React.useState(0);
  const [tempo, setTempo] = React.useState(100);
  const done = i >= s.notes.length;
  const target = s.notes[i];
  const press = n => {
    if (done) return;
    if (n === target) {
      setWrong(null);
      setI(i + 1);
    } else {
      setWrong(n);
      setMisses(m => m + 1);
      setTimeout(() => setWrong(w => w === n ? null : w), 400);
    }
  };
  const restart = () => {
    setI(0);
    setMisses(0);
    setWrong(null);
  };
  const ks = {};
  if (i > 0) ks[s.notes[i - 1]] = 'correct';
  if (target) ks[target] = 'target';
  if (wrong) ks[wrong] = 'wrong';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--ok-white)'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      height: 56,
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      padding: '0 var(--gutter-desktop)',
      boxShadow: 'var(--elevation-inset)'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(IconButton, {
    icon: "x",
    label: "Exit lesson",
    variant: "ghost",
    onClick: () => go('song', s.id)
  })), /*#__PURE__*/React.createElement("div", {
    className: "ok-body-strong"
  }, s.title, " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-secondary)'
    }
  }, "\xB7 ", s.composer)), /*#__PURE__*/React.createElement("div", {
    style: {
      justifySelf: 'end',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "minus",
    label: "Slower",
    onClick: () => setTempo(t => Math.max(50, t - 10))
  }), /*#__PURE__*/React.createElement("span", {
    className: "ok-caption-md",
    style: {
      width: 56,
      textAlign: 'center'
    }
  }, tempo, "%"), /*#__PURE__*/React.createElement(IconButton, {
    icon: "plus",
    label: "Faster",
    onClick: () => setTempo(t => Math.min(150, t + 10))
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 2,
      background: 'var(--ok-hairline-soft)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 2,
      width: i / s.notes.length * 100 + '%',
      background: 'var(--ok-ink)',
      transition: 'width var(--duration-base) var(--ease-standard)'
    }
  })), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 30,
      padding: '48px var(--gutter-desktop)'
    }
  }, done ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Badge, {
    variant: "success"
  }, "Completed"), /*#__PURE__*/React.createElement("h1", {
    className: "ok-heading-xl",
    style: {
      margin: 0
    }
  }, "You played ", s.title, "."), /*#__PURE__*/React.createElement("div", {
    className: "ok-body",
    style: {
      color: 'var(--text-soft)'
    }
  }, s.notes.length, " notes \xB7 ", misses === 0 ? 'no mistakes' : misses + (misses === 1 ? ' missed note' : ' missed notes')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    onClick: () => go('library')
  }, "Next song"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    icon: "rotate-ccw",
    onClick: restart
  }, "Play again"))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "ok-caption-md",
    style: {
      color: 'var(--text-secondary)'
    }
  }, "Note ", i + 1, " of ", s.notes.length), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      justifyContent: 'center',
      maxWidth: 900
    }
  }, s.notes.map((n, k) => /*#__PURE__*/React.createElement("span", {
    key: k,
    style: {
      minWidth: 48,
      height: 40,
      padding: '8px 12px',
      borderRadius: 30,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: '500 16px/1.5 var(--font-sans)',
      background: k === i ? 'var(--ok-ink)' : 'var(--ok-white)',
      color: k === i ? 'var(--ok-white)' : k < i ? 'var(--ok-green)' : 'var(--ok-ink)',
      border: '1px solid ' + (k === i ? 'var(--ok-ink)' : 'var(--ok-hairline)')
    }
  }, n.replace(/\d/, '')))), /*#__PURE__*/React.createElement("div", {
    className: "ok-heading-lg"
  }, "Play ", /*#__PURE__*/React.createElement("span", {
    style: {
      textDecoration: 'underline',
      textUnderlineOffset: 6
    }
  }, target)), misses ? /*#__PURE__*/React.createElement(Badge, {
    variant: "error"
  }, misses, " missed ", misses === 1 ? 'note' : 'notes') : /*#__PURE__*/React.createElement(Badge, {
    variant: "muted"
  }, "Tap the blue key"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: '0 0 18px'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "skip-back",
    label: "Restart",
    onClick: restart
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "play",
    label: "Play demo",
    variant: "inverse",
    size: 56
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "repeat",
    label: "Loop"
  })), /*#__PURE__*/React.createElement(PianoKeyboard, {
    startOctave: 4,
    octaves: 2,
    height: 220,
    keyStates: ks,
    onKeyPress: press
  }));
}
window.PlayerScreen = PlayerScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/PlayerScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Shared.jsx
try { (() => {
const DS = window.OpenKeysDesignSystem_dedd02;
const {
  PrimaryNav,
  SearchPill,
  IconButton,
  PianoKeyboard,
  SongCard
} = DS;
function KeysPreview({
  notes
}) {
  const ks = {};
  (notes || []).slice(0, 4).forEach(n => {
    ks[n] = 'target';
  });
  const start = (notes || []).some(n => /5$/.test(n)) ? 4 : 4;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: '78%',
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement(PianoKeyboard, {
    startOctave: start,
    octaves: 2,
    showLabels: "none",
    height: 84,
    keyStates: ks
  }));
}
function songCardProps(s, D) {
  return {
    title: s.title,
    subtitle: s.composer + ' · ' + s.level,
    badge: s.badge,
    meta: s.progress === 100 ? 'Completed' : s.progress > 0 ? s.progress + '% complete' : s.mins + ' min',
    metaVariant: s.progress === 100 ? 'success' : undefined,
    swatches: [{
      color: D.genreColor[s.genre],
      label: s.genre
    }],
    media: /*#__PURE__*/React.createElement(KeysPreview, {
      notes: s.notes
    }),
    aspectRatio: '4 / 3'
  };
}
function AppNav({
  route,
  go
}) {
  return /*#__PURE__*/React.createElement(PrimaryNav, {
    links: [{
      id: 'home',
      label: 'Learn'
    }, {
      id: 'library',
      label: 'Songs'
    }, {
      id: 'practice',
      label: 'Practice'
    }],
    active: route === 'song' || route === 'player' ? 'library' : route,
    onNavigate: id => go(id === 'practice' ? 'library' : id),
    style: {
      boxShadow: 'var(--elevation-inset)'
    },
    right: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(SearchPill, {
      placeholder: "Search songs"
    }), /*#__PURE__*/React.createElement(IconButton, {
      icon: "user",
      label: "Profile",
      variant: "ghost"
    }))
  });
}
function SectionHead({
  title,
  action,
  onAction
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "ok-heading-xl",
    style: {
      margin: 0
    }
  }, title), action ? /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "ok-link",
    onClick: e => {
      e.preventDefault();
      onAction && onAction();
    }
  }, action) : null);
}
Object.assign(window, {
  DS,
  KeysPreview,
  songCardProps,
  AppNav,
  SectionHead
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Shared.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/SongScreen.jsx
try { (() => {
function SongScreen({
  songId,
  go
}) {
  const {
    Button,
    IconButton,
    DisclosureRow,
    SwatchDot,
    Badge,
    PianoKeyboard
  } = DS;
  const D = window.OK_DATA;
  const s = D.songs.find(x => x.id === songId) || D.songs[0];
  const [arr, setArr] = React.useState(0);
  const arrangements = ['Melody only', 'Melody + bass', 'Full arrangement'];
  const ks = {};
  s.notes.slice(0, 4).forEach(n => {
    ks[n] = 'target';
  });
  return /*#__PURE__*/React.createElement("main", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)',
      gap: 48,
      padding: '24px var(--gutter-desktop) 48px',
      maxWidth: 1440,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      background: 'var(--ok-soft-cloud)',
      aspectRatio: '1 / 1',
      maxHeight: 640,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 18,
      left: 18,
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "arrow-left",
    label: "Back",
    variant: "onImage",
    onClick: () => go('library')
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 18,
      right: 18,
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "heart",
    label: "Save",
    variant: "onImage"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "share-2",
    label: "Share",
    variant: "onImage"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: '82%',
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement(PianoKeyboard, {
    octaves: 2,
    height: 150,
    keyStates: ks
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      paddingTop: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, s.badge ? /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement(Badge, null, s.badge)) : null, /*#__PURE__*/React.createElement("h1", {
    className: "ok-heading-xl",
    style: {
      margin: 0
    }
  }, s.title), /*#__PURE__*/React.createElement("div", {
    className: "ok-body-strong"
  }, s.composer), /*#__PURE__*/React.createElement("div", {
    className: "ok-caption-md",
    style: {
      color: 'var(--text-secondary)'
    }
  }, s.level, " \xB7 ", s.hands, " \xB7 ", s.bpm, " bpm \xB7 ", s.mins, " min")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ok-body-strong"
  }, "Arrangement: ", arrangements[arr]), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14
    }
  }, [D.genreColor[s.genre], 'var(--ok-ink)', 'var(--ok-accent-pink-deep)'].map((c, i) => /*#__PURE__*/React.createElement(SwatchDot, {
    key: i,
    color: c,
    size: 16,
    active: arr === i,
    label: arrangements[i],
    onClick: () => setArr(i)
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    fullWidth: true,
    icon: "play",
    onClick: () => go('player', s.id)
  }, s.progress > 0 && s.progress < 100 ? 'Resume lesson' : 'Start lesson'), /*#__PURE__*/React.createElement(Button, {
    fullWidth: true,
    variant: "secondary",
    icon: "headphones"
  }, "Listen first")), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--ok-hairline)'
    }
  }, /*#__PURE__*/React.createElement(DisclosureRow, {
    title: "What you'll learn",
    defaultOpen: true
  }, "The right-hand melody in ", s.notes.length, " notes, at your own pace. Keys light up blue when it's their turn."), /*#__PURE__*/React.createElement(DisclosureRow, {
    title: "Sheet music"
  }, "Download the PDF or view it alongside the keyboard."), /*#__PURE__*/React.createElement(DisclosureRow, {
    title: "Practice tips"
  }, "Play slowly first. Speed comes later."))));
}
window.SongScreen = SongScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/SongScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/data.js
try { (() => {
window.OK_DATA = {
  songs: [{
    id: 'ode',
    title: 'Ode to Joy',
    composer: 'Beethoven',
    level: 'Beginner',
    hands: 'Right hand',
    genre: 'Classical',
    mins: 3,
    bpm: 90,
    progress: 100,
    notes: ['E4', 'E4', 'F4', 'G4', 'G4', 'F4', 'E4', 'D4', 'C4', 'C4', 'D4', 'E4', 'E4', 'D4', 'D4']
  }, {
    id: 'twinkle',
    title: 'Twinkle, Twinkle',
    composer: 'Traditional',
    level: 'Beginner',
    hands: 'Right hand',
    genre: 'Folk',
    mins: 2,
    bpm: 80,
    progress: 60,
    notes: ['C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4', 'D4', 'C4']
  }, {
    id: 'lamb',
    title: 'Mary Had a Little Lamb',
    composer: 'Traditional',
    level: 'Beginner',
    hands: 'Right hand',
    genre: 'Folk',
    mins: 2,
    bpm: 96,
    progress: 0,
    badge: 'New',
    notes: ['E4', 'D4', 'C4', 'D4', 'E4', 'E4', 'E4', 'D4', 'D4', 'D4', 'E4', 'G4', 'G4']
  }, {
    id: 'elise',
    title: 'Für Elise',
    composer: 'Beethoven',
    level: 'Intermediate',
    hands: 'Both hands',
    genre: 'Classical',
    mins: 4,
    bpm: 72,
    progress: 0,
    badge: 'Popular',
    notes: ['E5', 'D#5', 'E5', 'D#5', 'E5', 'B4', 'D5', 'C5', 'A4']
  }, {
    id: 'gymno',
    title: 'Gymnopédie No. 1',
    composer: 'Satie',
    level: 'Intermediate',
    hands: 'Both hands',
    genre: 'Classical',
    mins: 5,
    bpm: 66,
    progress: 0,
    notes: ['F#5', 'A5', 'G5', 'F#5', 'C#5', 'B4', 'C#5', 'D5', 'A4']
  }, {
    id: 'saints',
    title: 'When the Saints',
    composer: 'Traditional',
    level: 'Beginner',
    hands: 'Both hands',
    genre: 'Jazz',
    mins: 3,
    bpm: 110,
    progress: 0,
    notes: ['C4', 'E4', 'F4', 'G4', 'C4', 'E4', 'F4', 'G4', 'C4', 'E4', 'F4', 'G4', 'E4', 'C4', 'E4', 'D4']
  }],
  genreColor: {
    Classical: 'var(--ok-accent-purple-soft)',
    Folk: 'var(--ok-accent-teal)',
    Jazz: 'var(--ok-accent-pink)'
  }
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/data.js", error: String((e && e.message) || e) }); }

// ui_kits/website/HomePage.jsx
try { (() => {
function HomePage({
  go
}) {
  const {
    CampaignTile,
    SongCard,
    CategoryIconCard,
    BenefitCard,
    DisclosureRow,
    Button,
    PianoKeyboard
  } = DS;
  const songs = [['Ode to Joy', 'Beethoven · Beginner', '3 min', ['E4', 'F4', 'G4'], 'var(--ok-accent-purple-soft)'], ['Twinkle, Twinkle', 'Traditional · Beginner', '2 min', ['C4', 'G4', 'A4'], 'var(--ok-accent-teal)'], ['Für Elise', 'Beethoven · Intermediate', '4 min', ['E5', 'D#5', 'B4'], 'var(--ok-accent-purple-soft)'], ['When the Saints', 'Traditional · Beginner', '3 min', ['C4', 'E4', 'F4'], 'var(--ok-accent-pink)']];
  return /*#__PURE__*/React.createElement("main", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 48,
      paddingBottom: 48
    }
  }, /*#__PURE__*/React.createElement(CampaignTile, {
    headline: "Learn piano.\nFor free.",
    cta: "Start learning",
    onCta: () => {
      location.href = '../app/index.html';
    },
    height: 600
  }, /*#__PURE__*/React.createElement("div", {
    className: "ok-caption-sm",
    style: {
      position: 'absolute',
      top: 18,
      right: 24,
      color: 'var(--ok-stone)'
    }
  }, "Photography slot \u2014 hands on keys")), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '0 var(--gutter-desktop)'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "ok-heading-xl",
    style: {
      margin: '0 0 18px'
    }
  }, "Start with these"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, minmax(0,1fr))',
      gap: 8
    }
  }, songs.map(([t, sub, m, n, c], i) => {
    const ks = {};
    n.forEach(x => {
      ks[x] = 'target';
    });
    return /*#__PURE__*/React.createElement(SongCard, {
      key: t,
      title: t,
      subtitle: sub,
      meta: m,
      badge: i === 2 ? 'Popular' : undefined,
      swatches: [{
        color: c
      }],
      aspectRatio: "1 / 1",
      media: /*#__PURE__*/React.createElement("div", {
        style: {
          width: '82%',
          pointerEvents: 'none'
        }
      }, /*#__PURE__*/React.createElement(PianoKeyboard, {
        octaves: 2,
        showLabels: "none",
        height: 72,
        keyStates: ks
      }))
    });
  }))), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '0 var(--gutter-desktop)'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "ok-heading-xl",
    style: {
      margin: '0 0 18px'
    }
  }, "Learn the basics"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(6, minmax(0,1fr))',
      borderTop: '1px solid var(--ok-hairline)'
    }
  }, [['book-open', 'Reading notes'], ['hand', 'Hand position'], ['timer', 'Rhythm'], ['keyboard', 'Scales'], ['list-music', 'Chords'], ['headphones', 'Ear training']].map(([i, l]) => /*#__PURE__*/React.createElement(CategoryIconCard, {
    key: l,
    icon: i,
    label: l
  })))), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '0 var(--gutter-desktop)'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "ok-heading-xl",
    style: {
      margin: '0 0 18px'
    }
  }, "Why OpenKeys"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0,1fr))',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(BenefitCard, {
    title: "Free. No ads, no trials, no paywall.",
    cta: "Our pledge",
    onCta: () => go('why')
  }), /*#__PURE__*/React.createElement(BenefitCard, {
    title: "Plug in any MIDI keyboard. Or use your laptop keys.",
    background: "var(--ok-charcoal)"
  }), /*#__PURE__*/React.createElement(BenefitCard, {
    title: "Open-source. Read the code, fix a bug, add a song.",
    background: "var(--ok-accent-pink-deep)",
    cta: "Contribute"
  }))));
}
window.HomePage = HomePage;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/HomePage.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/SiteChrome.jsx
try { (() => {
const DS = window.OpenKeysDesignSystem_dedd02;
function SiteHeader({
  page,
  go
}) {
  const {
    UtilityBar,
    PrimaryNav,
    SearchPill,
    IconButton,
    Button
  } = DS;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 5,
      background: 'var(--ok-white)',
      boxShadow: 'var(--elevation-inset)'
    }
  }, /*#__PURE__*/React.createElement(UtilityBar, {
    left: "Free and open-source. Forever.",
    links: [{
      label: 'GitHub'
    }, {
      label: 'Docs'
    }, {
      label: 'Help'
    }, {
      label: 'Sign in'
    }]
  }), /*#__PURE__*/React.createElement(PrimaryNav, {
    links: [{
      id: 'home',
      label: 'Learn piano'
    }, {
      id: 'songs',
      label: 'Songs'
    }, {
      id: 'why',
      label: 'Why free'
    }, {
      id: 'contribute',
      label: 'Contribute'
    }],
    active: page,
    onNavigate: id => go(id === 'songs' || id === 'contribute' ? page : id),
    right: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(SearchPill, {
      placeholder: "Search songs"
    }), /*#__PURE__*/React.createElement(IconButton, {
      icon: "github",
      label: "GitHub",
      variant: "ghost"
    }))
  }));
}
function SiteFooter() {
  const {
    Footer
  } = DS;
  return /*#__PURE__*/React.createElement(Footer, {
    columns: [{
      title: 'Learn',
      links: ['Lessons', 'Songs', 'Practice tools', 'MIDI keyboards']
    }, {
      title: 'Project',
      links: ['GitHub', 'Roadmap', 'Contribute', 'Translations']
    }, {
      title: 'Help',
      links: ['FAQ', 'Getting started', 'Report a bug']
    }, {
      title: 'Community',
      links: ['Forum', 'Discord', 'Newsletter']
    }],
    legal: ['© 2026 OpenKeys contributors', 'MIT License', 'Privacy', 'No tracking. No ads.']
  });
}
Object.assign(window, {
  DS,
  SiteHeader,
  SiteFooter
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/SiteChrome.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/WhyPage.jsx
try { (() => {
function WhyPage({
  go
}) {
  const {
    CampaignTile,
    Button,
    DisclosureRow
  } = DS;
  return /*#__PURE__*/React.createElement("main", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 48,
      paddingBottom: 48
    }
  }, /*#__PURE__*/React.createElement(CampaignTile, {
    headline: "Free.\nForever.",
    cta: "Read the code",
    height: 480,
    background: "var(--ok-accent-pink-deep)"
  }), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '0 var(--gutter-desktop)',
      display: 'grid',
      gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
      gap: 48
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "ok-heading-xl",
    style: {
      margin: 0
    }
  }, "Music education shouldn't come with a subscription."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("p", {
    className: "ok-body",
    style: {
      margin: 0
    }
  }, "OpenKeys is built by volunteers and funded by donations. Every lesson, every song and every line of code is free to use, copy and improve."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    onClick: () => {
      location.href = '../app/index.html';
    }
  }, "Start learning"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    icon: "github"
  }, "View on GitHub")))), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: '0 var(--gutter-desktop)',
      maxWidth: 960
    }
  }, /*#__PURE__*/React.createElement("h2", {
    className: "ok-heading-xl",
    style: {
      margin: '0 0 18px'
    }
  }, "Questions"), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--ok-hairline)'
    }
  }, /*#__PURE__*/React.createElement(DisclosureRow, {
    variant: "faq",
    title: "Is it really free?",
    defaultOpen: true
  }, "Yes. No trials, no premium tier, no ads. The project is MIT licensed."), /*#__PURE__*/React.createElement(DisclosureRow, {
    variant: "faq",
    title: "Do I need a piano?"
  }, "No. Start with your computer keyboard or the on-screen keys. Any MIDI keyboard works when you're ready."), /*#__PURE__*/React.createElement(DisclosureRow, {
    variant: "faq",
    title: "Can I add my own songs?"
  }, "Yes. Songs are plain files in the repository. Open a pull request."), /*#__PURE__*/React.createElement(DisclosureRow, {
    variant: "faq",
    title: "Does it track me?"
  }, "No accounts required, no analytics. Progress is stored on your device."))));
}
window.WhyPage = WhyPage;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/WhyPage.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.SwatchDot = __ds_scope.SwatchDot;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.FilterChip = __ds_scope.FilterChip;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.BenefitCard = __ds_scope.BenefitCard;

__ds_ns.CampaignTile = __ds_scope.CampaignTile;

__ds_ns.CategoryIconCard = __ds_scope.CategoryIconCard;

__ds_ns.SongCard = __ds_scope.SongCard;

__ds_ns.ICON_NAMES = __ds_scope.ICON_NAMES;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.PianoKeyboard = __ds_scope.PianoKeyboard;

__ds_ns.DisclosureRow = __ds_scope.DisclosureRow;

__ds_ns.SearchPill = __ds_scope.SearchPill;

__ds_ns.FilterSidebar = __ds_scope.FilterSidebar;

__ds_ns.Footer = __ds_scope.Footer;

__ds_ns.PrimaryNav = __ds_scope.PrimaryNav;

__ds_ns.SubNav = __ds_scope.SubNav;

__ds_ns.UtilityBar = __ds_scope.UtilityBar;

})();
