{{--
    Sidebar styling for the admin panel.

    Filament's default sidebar is the same near-white as the page, so the two
    read as one surface. This gives it the site's dark brown with gold accents,
    so the navigation is clearly its own region.

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
        --sansekai-accent: #a17c45;
    }

    .fi-sidebar,
    .fi-main-sidebar {
        background-color: var(--sansekai-sidebar);
        border-inline-end: 1px solid var(--sansekai-sidebar-border);
    }

    .fi-sidebar-header {
        background-color: var(--sansekai-sidebar-header);
        border-bottom: 1px solid var(--sansekai-sidebar-border);
        box-shadow: none;
    }

    /* Wordmark sits on the dark header. */
    .fi-sidebar-header .fi-logo {
        color: hsl(30 20% 96%);
    }

    .fi-sidebar-group-label {
        color: var(--sansekai-sidebar-muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 0.6875rem;
    }

    .fi-sidebar-item-btn {
        color: var(--sansekai-sidebar-text);
        border-radius: 0.5rem;
        transition:
            background-color 0.15s ease,
            color 0.15s ease;
    }

    .fi-sidebar-item-icon {
        color: var(--sansekai-sidebar-muted);
    }

    .fi-sidebar-item-btn:hover {
        background-color: hsl(30 10% 24%);
        color: hsl(30 20% 97%);
    }

    .fi-sidebar-item-btn:hover .fi-sidebar-item-icon {
        color: var(--sansekai-accent);
    }

    /* Current page: gold rail, tinted background, brighter label. */
    .fi-sidebar-item.fi-active > .fi-sidebar-item-btn {
        background-color: color-mix(in srgb, var(--sansekai-accent) 20%, transparent);
        color: hsl(30 25% 98%);
        font-weight: 600;
        box-shadow: inset 3px 0 0 0 var(--sansekai-accent);
    }

    .fi-sidebar-item.fi-active .fi-sidebar-item-icon {
        color: var(--sansekai-accent);
    }

    /* Keyboard focus has to stay visible against the dark surface. */
    .fi-sidebar-item-btn:focus-visible {
        outline: 2px solid var(--sansekai-accent);
        outline-offset: -2px;
    }
</style>
