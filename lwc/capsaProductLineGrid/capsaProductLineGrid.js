import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import categoryImages from '@salesforce/resourceUrl/capsaCategoryImages';
import getCategories from '@salesforce/apex/CapsaProductLineGridController.getCategories';
import { recordRef, webRef } from 'c/capsaNav';

const CATEGORY_OBJECT = 'ProductCategory';

// Card catalogue. Each card carries a stable category NAME (resolved to a
// ProductCategory id at run time for the current org) plus its image file name
// inside the capsaCategoryImages static resource. No org-specific ids or URLs
// are baked in, so the grid works unchanged in sandbox and production.
const DEFAULT_CARDS = [
    { title: 'Medical Cart/Medication Cart', image: 'medCart.jpg' },
    { title: 'Medical Computer Cart', image: 'compCart.jpg' },
    { title: 'Medical Equipment/ Supply Cabinets', image: 'supplyCab.jpg' },
    { title: 'Kirby Lester Pill Counter', image: 'pillCounter.jpg' },
    { title: 'Wall Mounted Work Stations', image: 'wallMount.jpg' },
    { title: 'Monitor and Tablet Carts', image: 'monitorCart.jpg' },
    { title: 'Supplies', image: 'supplies.jpg' }
];

export default class CapsaProductLineGrid extends NavigationMixin(LightningElement) {
    @api heading = 'Shop Parts by Product Line';
    @api subheading =
        'Select your Capsa Healthcare product to browse available replacement parts, accessories, and supplies';
    @api cardsJson;

    // category name -> id, resolved at run time for the current org.
    categoryIdByName = {};
    // card key -> href generated via NavigationMixin (correct in any org, and
    // supports right-click / open-in-new-tab).
    urlByKey = {};

    // Cards from defaults or Builder config, normalised. `categoryName` is what
    // we resolve to an id; `categoryId` / `linkUrl` are optional explicit
    // overrides an admin may set in the cardsJson property.
    get baseCards() {
        let source = DEFAULT_CARDS;
        if (this.cardsJson) {
            try {
                const parsed = JSON.parse(this.cardsJson);
                if (Array.isArray(parsed) && parsed.length) {
                    source = parsed;
                }
            } catch (parseError) {
                // Invalid JSON entered in Builder — keep defaults.
                console.warn('capsaProductLineGrid: invalid cardsJson', parseError);
            }
        }
        return source.map((card, index) => ({
            key: index,
            title: card.title,
            categoryName: card.categoryName || card.title,
            categoryId: card.categoryId || null,
            linkUrl: card.linkUrl || null,
            imageUrl: this.imageFor(card)
        }));
    }

    imageFor(card) {
        if (card.imageUrl) {
            return card.imageUrl; // full URL override
        }
        if (card.image) {
            return `${categoryImages}/${card.image}`;
        }
        return null;
    }

    // Names the server needs to resolve (those without an explicit id or URL).
    get categoryNames() {
        return this.baseCards
            .filter((c) => !c.categoryId && !c.linkUrl)
            .map((c) => c.categoryName);
    }

    connectedCallback() {
        this.resolveCategories();
    }

    // Resolve category ids for the current org (imperative for predictable
    // timing). The running user — including the site Guest User on the public
    // home page — must have Apex access to CapsaProductLineGridController, or
    // the cards render but cannot navigate.
    async resolveCategories() {
        const names = this.categoryNames;
        if (!names.length) {
            return;
        }
        try {
            const data = await getCategories({ names });
            const map = {};
            (data || []).forEach((c) => {
                map[c.name] = c.id;
            });
            this.categoryIdByName = map;
            this.generateUrls();
        } catch (error) {
            console.error('capsaProductLineGrid: getCategories failed', error);
        }
    }

    // Cards decorated with the resolved category id and a real href.
    get cards() {
        return this.baseCards.map((c) => ({
            ...c,
            categoryId: c.categoryId || this.categoryIdByName[c.categoryName] || null,
            url: c.linkUrl || this.urlByKey[c.key] || '#'
        }));
    }

    // Build environment-independent hrefs for every resolvable card.
    generateUrls() {
        this.baseCards.forEach((c) => {
            if (c.linkUrl) {
                return; // explicit legacy URL is already usable
            }
            const categoryId = c.categoryId || this.categoryIdByName[c.categoryName];
            if (!categoryId) {
                return;
            }
            this[NavigationMixin.GenerateUrl](recordRef(categoryId, CATEGORY_OBJECT))
                .then((url) => {
                    this.urlByKey = { ...this.urlByKey, [c.key]: url };
                })
                .catch(() => {
                    // GenerateUrl failed — the click handler still navigates by id.
                });
        });
    }

    handleCardClick(event) {
        event.preventDefault();
        const key = Number(event.currentTarget.dataset.key);
        const card = this.cards.find((c) => c.key === key);
        if (!card) {
            return;
        }
        // Explicit legacy URL wins; otherwise navigate to the category record
        // page by id (Salesforce builds the correct URL for this org).
        if (card.linkUrl) {
            this[NavigationMixin.Navigate](webRef(card.linkUrl));
            return;
        }
        if (card.categoryId) {
            this[NavigationMixin.Navigate](recordRef(card.categoryId, CATEGORY_OBJECT));
        }
    }
}