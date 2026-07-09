import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import basePath from '@salesforce/community/basePath';

/**
 * Header heart icon that opens the "My List" (wishlist) page.
 * Placed in the commerce header next to the user profile menu.
 */
export default class CapsaB2bWishlistButton extends NavigationMixin(LightningElement) {
    // URL prefix of the My List route (Wishlist route urlPrefix = "mylists").
    @api targetPath = 'mylists';
    @api assistiveText = 'My List';

    connectedCallback() {
        this.injectHeaderStyles();
    }

    // The standard profile menu renders its own bordered button, which sits
    // inside the header box and shows as a second (inner) border. Inject a
    // global stylesheet once to strip that inner border/background so only the
    // outer header box remains — matching the heart and cart.
    injectHeaderStyles() {
        const STYLE_ID = 'capsa-b2b-header-style';
        if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) {
            return;
        }
        const style = document.createElement('style');
        style.id = STYLE_ID;
        // The inner border sits in the component's shadow DOM, which plain
        // selectors can't pierce. CSS custom properties (SLDS styling hooks)
        // DO inherit across the shadow boundary, so set them on the host to
        // neutralise the inner button's border/background. The direct
        // selectors are a fallback for any light-DOM rendering.
        style.textContent = `
            commerce_builder-user-profile-menu,
            commerce_builder-user-profile-menu * {
                --slds-c-button-neutral-color-border: transparent;
                --slds-c-button-neutral-color-background: transparent;
                --slds-c-button-neutral-color-border-hover: transparent;
                --slds-c-button-neutral-color-background-hover: transparent;
                --slds-c-button-neutral-color-border-focus: transparent;
                --sds-c-button-neutral-color-border: transparent;
                --sds-c-button-neutral-color-background: transparent;
                --slds-c-button-color-border: transparent;
                --slds-c-icon-button-color-border: transparent;
            }
            commerce_builder-user-profile-menu button,
            commerce_builder-user-profile-menu a,
            commerce_builder-user-profile-menu [role="button"],
            commerce_builder-user-profile-menu .slds-button,
            commerce_builder-user-profile-menu [class*="button"],
            commerce_builder-user-profile-menu [class*="container"] {
                border-color: transparent !important;
                box-shadow: none !important;
                background-color: transparent !important;
            }

            /* Product Media Gallery hover-zoom: shrink the right-side zoom
               panel to ~1/3 — reduces both its footprint/height and the
               apparent magnification. */
            .zoomed-image-container {
                transform: scale(0.5) !important;
                transform-origin: top left !important;
            }
        `;
        document.head.appendChild(style);
    }

    handleClick() {
        const prefix = (this.targetPath || 'mylists').replace(/^\//, '');
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: `${basePath}/${prefix}`
            }
        });
    }
}