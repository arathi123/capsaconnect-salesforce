/**
 * Shared utility for metadata-driven option visibility.
 *
 * HOW IT WORKS (zero-code configuration for admins):
 * ─────────────────────────────────────────────────
 * On any Configurator_Option__mdt record, populate the
 * Visibility_Filter__c field with a JSON object whose keys
 * are Step Keys and values are the Option Key(s) that must
 * have been selected in that step for this option to appear.
 *
 * FORMAT:
 *   {"STEP_KEY": "OPTION_KEY"}           → single required value
 *   {"STEP_KEY": "KEY1,KEY2"}            → OR  – visible if either KEY1 or KEY2 was selected
 *   {"STEP_KEY": "KEY1", "STEP2": "K2"}  → AND – both conditions must be true
 *
 * EXAMPLES:
 *   {"CART TYPE": "STD"}
 *     → Only shown when the user selected option key "STD" in the Cart Type step.
 *
 *   {"CART TYPE": "STD,PED"}
 *     → Shown when Cart Type is either "STD" or "PED".
 *
 *   {"CART TYPE": "STD", "HEIGHT": "10"}
 *     → Shown only when Cart Type = STD AND Height = 10.
 *
 * BLANK / NULL → option is always visible.
 *
 * @param {Object} opt         - A Configurator_Option__mdt record (must have Visibility_Filter__c)
 * @param {string} contextJson - JSON string from capsaBuildYourOwn.selectionContextJson
 * @returns {boolean}
 */
export function isOptionVisible(opt, contextJson) {
    if (!opt.Visibility_Filter__c) return true;
    if (!contextJson) return true;

    let rules, context;
    try {
        rules   = JSON.parse(opt.Visibility_Filter__c);
        context = JSON.parse(contextJson);
    } catch (e) {
        // Malformed JSON → show the option (fail-open)
        return true;
    }

    return Object.entries(rules).every(([stepKey, allowedRaw]) => {
        const selectedKey = (context[stepKey] || '').trim();
        const allowed     = allowedRaw.split(',').map(v => v.trim());
        return allowed.includes(selectedKey);
    });
}

/**
 * Convenience filter for an entire array of options.
 * Drop-in replacement for array.filter in step components.
 *
 * @param {Array}  options     - Raw options from wire adapter
 * @param {string} contextJson - From capsaBuildYourOwn.selectionContextJson
 * @returns {Array}
 */
export function filterVisible(options, contextJson) {
    if (!options) return [];
    return options.filter(opt => isOptionVisible(opt, contextJson));
}