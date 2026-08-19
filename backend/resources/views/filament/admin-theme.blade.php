{{--
    Sidebar styling for the admin panel.

    Filament's default sidebar is the same near-white as the page, so the two
    read as one surface. This gives it the site's dark brown, with white
    highlights for hover and the current page.

    Every rule is prefixed with `.fi-sidebar` deliberately: Filament colours the
    active item's label and icon with `--primary-*` at up to four classes of
    specificity, so a shorter selector loses and the highlights stay gold.

    Injected through the STYLES_AFTER render hook rather than shipped as an
    asset, so it needs no build step and no extra proxy rule on the Next.js side.
--}}
<style>
    :root {
        --sansekai-sidebar: hsl(30 10% 18%);
        --sansekai-sidebar-header: hsl(30 10% 14%);
        --sansekai-sidebar-border: hsl(30 10% 26%);
        --sansekai-sidebar-text: hsl(30 12% 78%);
        --sansekai-sidebar-muted: hsl(30 8% 58%);
        --sansekai-sidebar-hover: hsl(30 10% 24%);
        /* Hover and current-page highlights read white against the dark brown. */
        --sansekai-sidebar-active: hsl(30 20% 98%);
    }

    .fi-sidebar,
    .fi-main-sidebar {
        background-color: var(--sansekai-sidebar);
        border-inline-end: 1px solid var(--sansekai-sidebar-border);
    }

    .fi-sidebar .fi-sidebar-header {
        background-color: var(--sansekai-sidebar-header);
        border-bottom: 1px solid var(--sansekai-sidebar-border);
        box-shadow: none;
    }

    /* Wordmark sits on the dark header. */
    .fi-sidebar .fi-sidebar-header .fi-logo {
        color: var(--sansekai-sidebar-active);
    }

    .fi-sidebar .fi-sidebar-group-label {
        color: var(--sansekai-sidebar-muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 0.6875rem;
    }

    /* Resting state */
    .fi-sidebar .fi-sidebar-item > .fi-sidebar-item-btn {
        background-color: transparent;
        border-radius: 0.5rem;
        transition:
            background-color 0.15s ease,
            color 0.15s ease;
    }

    .fi-sidebar .fi-sidebar-item > .fi-sidebar-item-btn > .fi-sidebar-item-label {
        color: var(--sansekai-sidebar-text);
    }

    .fi-sidebar .fi-sidebar-item > .fi-sidebar-item-btn > .fi-sidebar-item-icon {
        color: var(--sansekai-sidebar-muted);
    }

    /* Hover */
    .fi-sidebar .fi-sidebar-item > .fi-sidebar-item-btn:hover {
        background-color: var(--sansekai-sidebar-hover);
    }

    .fi-sidebar
        .fi-sidebar-item
        > .fi-sidebar-item-btn:hover
        > .fi-sidebar-item-label,
    .fi-sidebar
        .fi-sidebar-item
        > .fi-sidebar-item-btn:hover
        > .fi-sidebar-item-icon {
        color: var(--sansekai-sidebar-active);
    }

    /* Current page: white rail, light tinted background, brighter label. */
    .fi-sidebar .fi-sidebar-item.fi-active > .fi-sidebar-item-btn {
        background-color: color-mix(
            in srgb,
            var(--sansekai-sidebar-active) 14%,
            transparent
        );
        box-shadow: inset 3px 0 0 0 var(--sansekai-sidebar-active);
    }

    .fi-sidebar
        .fi-sidebar-item.fi-active
        > .fi-sidebar-item-btn
        > .fi-sidebar-item-label {
        color: var(--sansekai-sidebar-active);
        font-weight: 600;
    }

    .fi-sidebar
        .fi-sidebar-item.fi-active
        > .fi-sidebar-item-btn
        > .fi-sidebar-item-icon {
        color: var(--sansekai-sidebar-active);
    }

    /* Keyboard focus has to stay visible against the dark surface. */
    .fi-sidebar .fi-sidebar-item > .fi-sidebar-item-btn:focus-visible {
        outline: 2px solid var(--sansekai-sidebar-active);
        outline-offset: -2px;
    }
</style>
