import { LightningElement, api, track } from 'lwc';
import getOptionsByStepAndFamily
    from '@salesforce/apex/CartConfiguratorController.getOptionsByStepAndFamily';


    const STORAGE_DRAWERS = [

        'TIER_TRIPLE',
        'TIER_DOUBLE',
        'TRIPLE_SINGLE',
        'TRIPLE_DOUBLE',
        'DOUBLE_SINGLE',
        'SINGLE_SINGLE',
        'DOUBLE_DEEP',
        'SINGLE_DEEP'

    ];


    const BUILDER_SKU_MAP = {

        TIER_TRIPLE: 'FG9M3833-GRY',
        TIER_DOUBLE: 'FG9M3822-GRY',
        TRIPLE_SINGLE: 'FG9M3813-GRY',
        TRIPLE_DOUBLE: 'FG9M3823-GRY',
        DOUBLE_SINGLE: 'FG9M3812-GRY',
        SINGLE_SINGLE: 'FG9M3811-GRY',
        DOUBLE_DEEP: 'FG9M38DD-GRY',
        SINGLE_DEEP: 'FG9M38QQ-GRY'

    };

    const MAXBIN_SKU_MAP = {

        SINGLE_BIN        : '207161',
        DOUBLE_BIN        : '207160',
        TRIPLE_BIN        : '207159',
        QUAD_BIN          : '207158',
        DOUBLE_SIDE_BIN   : '207374',

        DEEP_QUAD_BIN     : '207169',
        DEEP_TRIPLE_BIN   : '207170',
        DEEP_DOUBLE_BIN   : '207171',
        DEEP_SINGLE_BIN   : '207172'

    };

    const DRAWER_SLOT_SIZE = {

        // Occupies ONE physical tier

        SINGLE_BIN:1,
        DOUBLE_BIN:1,
        TRIPLE_BIN:1,
        QUAD_BIN:1,
        DOUBLE_SIDE_BIN:1,

        // Occupies TWO physical tiers

        DEEP_QUAD_BIN:2,
        DEEP_TRIPLE_BIN:2,
        DEEP_DOUBLE_BIN:2,
        DEEP_SINGLE_BIN:2,

        // XP / RX Builder
        TIER_TRIPLE:1,
        TIER_DOUBLE:1,
        TRIPLE_SINGLE:1,
        TRIPLE_DOUBLE:1,
        DOUBLE_SINGLE:1,
        SINGLE_SINGLE:1,
        DOUBLE_DEEP:1,
        SINGLE_DEEP:1

    };

    const BIN_LAYOUTS = {

        XP_LOCK:{
            slots:8,
            required:1,
            allowed: STORAGE_DRAWERS
        },

        XP_NON_LOCK:{
            slots:8,
            required:1,
            allowed: STORAGE_DRAWERS
        },

        RX_LOCK:{
            slots:8,
            required:2,
            allowed: STORAGE_DRAWERS
        },

        RX_NON_LOCK:{
            slots:8,
            required:2,
            allowed: STORAGE_DRAWERS
        },

        RX_XP_LOCK:{
            slots:8,
            required:3,
            allowed: STORAGE_DRAWERS
        },

        RX_5X9_LOCK:{
            slots:8,
            required:2,
            allowed: STORAGE_DRAWERS
        },

        RX_5X9_NON_LOCK:{
            slots:8,
            required:2,
            allowed: STORAGE_DRAWERS
        },

        MAXBIN_1:{
            slots:1,
            required:1,
            allowed:[
                'SINGLE_BIN',
                'DOUBLE_BIN',
                'TRIPLE_BIN',
                'QUAD_BIN',
                'DOUBLE_SIDE_BIN'
            ]
        },

        MAXBIN_2:{
            slots:2,
            required:2,
            allowed:[
                'SINGLE_BIN',
                'DOUBLE_BIN',
                'TRIPLE_BIN',
                'QUAD_BIN',
                'DOUBLE_SIDE_BIN',
                'DEEP_QUAD_BIN',
                'DEEP_TRIPLE_BIN',
                'DEEP_DOUBLE_BIN',
                'DEEP_SINGLE_BIN'
            ]
        },

        MAXBIN_3:{
            slots:3,
            required:3,
            allowed:[
                'SINGLE_BIN',
                'DOUBLE_BIN',
                'TRIPLE_BIN',
                'QUAD_BIN',
                'DOUBLE_SIDE_BIN',
                'DEEP_QUAD_BIN',
                'DEEP_TRIPLE_BIN',
                'DEEP_DOUBLE_BIN',
                'DEEP_SINGLE_BIN'
            ]
        },

        MAXBIN_4:{
            slots:4,
            required:4,
            allowed:[
                'SINGLE_BIN',
                'DOUBLE_BIN',
                'TRIPLE_BIN',
                'QUAD_BIN',
                'DOUBLE_SIDE_BIN',
                'DEEP_QUAD_BIN',
                'DEEP_TRIPLE_BIN',
                'DEEP_DOUBLE_BIN',
                'DEEP_SINGLE_BIN'
            ]
        },

        MAXBIN_5:{
            slots:5,
            required:5,
            allowed:[
                'SINGLE_BIN',
                'DOUBLE_BIN',
                'TRIPLE_BIN',
                'QUAD_BIN',
                'DOUBLE_SIDE_BIN',
                'DEEP_QUAD_BIN',
                'DEEP_TRIPLE_BIN',
                'DEEP_DOUBLE_BIN',
                'DEEP_SINGLE_BIN'
            ]
        },

    };



/*
==========================================================
Overlay Positions
==========================================================
*/

const SLOT_POSITIONS = {

    // ======================================
    // MAXBIN 1
    // ======================================

    1: [
        { top:'46%', left:'27%', width:'46%', z:20 }
    ],

    // ======================================
    // MAXBIN 2
    // ======================================
    2: [
        { top:'46%', left:'27%', width:'46%', z:20 },
        { top:'51%', left:'27%', width:'46%', z:19 }
    ],

    // ======================================
    // MAXBIN 3
    // ======================================

    3: [
        { top:'46%', left:'27%', width:'46%', z:20 },
        { top:'51%', left:'27%', width:'46%', z:19 },
        { top:'56%', left:'27%', width:'46%', z:18 }
    ],

    // ======================================
    // MAXBIN 4
    // ======================================

    4: [
        { top:'46%', left:'27%', width:'46%', z:20 },
        { top:'51%', left:'27%', width:'46%', z:19 },
        { top:'56%', left:'27%', width:'46%', z:18 },
        { top:'61%', left:'27%', width:'46%', z:18 }

    ],

    // ======================================
    // MAXBIN 5
    // ======================================

    5: [
        { top:'46%', left:'27%', width:'46%', z:20 },
        { top:'51%', left:'27%', width:'46%', z:19 },
        { top:'56%', left:'27%', width:'46%', z:18 },
        { top:'61%', left:'27%', width:'46%', z:18 },
        { top:'66%', left:'27%', width:'46%', z:18 }
    ],

    // XP / RX / RX+XP (8 Physical Positions)
8: [

    { top:'46%', left:'32%', width:'37%', z:20 },
    { top:'55%', left:'32%', width:'37%', z:19 },
    { top:'64%', left:'32%', width:'37%', z:18 },
    { top:'73%', left:'32%', width:'37%', z:17 },
    { top:'82%', left:'32%', width:'37%', z:16 },
    { top:'91%', left:'32%', width:'37%', z:15 },
    { top:'100%', left:'32%', width:'37%', z:14 },
    { top:'109%', left:'32%', width:'37%', z:13 }

]
};

export default class TrioStorageBuilder extends LightningElement{

    @api productType='Trio';

    @api selections;

    @track isLoading=true;

    @track builderOptions=[];

    @track binOptions=[];

    @track drawerCards=[];

    @track slotData=[];
    requiredSelections = 0;

    @track baseCartImage='';

    connectedCallback(){

        this.initializeBuilder();

    }

    async initializeBuilder(){

        try{

            const results=await Promise.all([

                getOptionsByStepAndFamily({

                    stepKey:'BUILDER',

                    productFamily:this.productType

                }),

                getOptionsByStepAndFamily({

                    stepKey:'BIN TYPE',

                    productFamily:this.productType

                })

            ]);

            this.builderOptions=results[0]||[];

            this.binOptions=results[1]||[];

            this.initializeLayout();

        }
        catch(error){

            console.error(error);

        }
        finally{

            this.isLoading=false;

        }

    }

    /*
==========================================================
Selected Bin Type
==========================================================
*/

get selectedBinType(){

    return this.selections?.STORAGE?.[3]?.key || '';

}

/*
==========================================================
Initialize Builder Layout
==========================================================
*/

initializeLayout(){

    const layout =
        BIN_LAYOUTS[this.selectedBinType];
        this.requiredSelections = layout.required;

    if(!layout){

        console.warn(
            'Unknown Bin Type',
            this.selectedBinType
        );

        return;

    }

    /*
    ----------------------------------------
    Load Base Cart Image
    ----------------------------------------
    */

    const cart =
        this.binOptions.find(

            x =>
                x.Option_Key__c ===
                this.selectedBinType

        );

    this.baseCartImage =
        cart?.Image_URL__c
        || this.selections?.previewImage
        || '/resource/trioImagePart1/trioImagePart1/documentation.jpg';

    /*
    ----------------------------------------
    Create Physical Cart Slots
    ----------------------------------------
    */

    this.slotData=[];

    const positions =
        SLOT_POSITIONS[layout.slots];

    positions.forEach((pos,index)=>{

        this.slotData.push({

            id:index+1,

            index:index,

            drawerKey:'',

            drawerLabel:'',

            drawerImage:'',

            drawerType:'',

            filled:false,

            cssStyle:
                `top:${pos.top};
                 left:${pos.left};
                 width:${pos.width};
                 z-index:${pos.z};`,

            removeStyle:
            `top:calc(${pos.top} + 2%);
            left:76%;
            z-index:999;`

        });

    });

    /*
    ----------------------------------------
    Build Drawer Cards
    ----------------------------------------
    */

    this.drawerCards =
        this.builderOptions

        .filter(

            option=>

                layout.allowed.includes(

                    option.Option_Key__c

                )

        )

        .map(option=>{

            /*
            Count how many
            physical slots
            accept this drawer
            */

            return{

                ...option,

                addedCount:0,

                 maxAllowed: layout.slots,

                disabled:false,

                buttonLabel:'+ Add'

            };

        });

}

/*
==========================================================
ADD DRAWER
==========================================================
*/

handleAdd(event){

    const drawerKey =
        event.currentTarget.dataset.key;

    const drawer =
        this.drawerCards.find(

            x =>
                x.Option_Key__c === drawerKey

        );

    if(!drawer){
        return;
    }

    /*
    Find first empty slot
    */

    const slotIndex =
        this.slotData.findIndex(

            slot => !slot.filled

        );

    if(slotIndex === -1){
        return;
    }

    /*
    Fill slot
    */

    this.slotData =
        this.slotData.map((slot,index)=>{

            if(index===slotIndex){

                return{

                    ...slot,

                    drawerKey:
                        drawer.Option_Key__c,

                    drawerLabel:
                        drawer.Option_Label__c,

                    drawerImage:
                        drawer.Image_URL__c,

                    drawerType:
                        drawer.Option_Key__c,

                    filled:true

                };

            }

            return slot;

        });

    /*
    Update Add button counts
    */

    this.updateDrawerCounts();

}


/*
==========================================================
REMOVE DRAWER
==========================================================
*/

handleRemove(event){

    const index =
        Number(event.currentTarget.dataset.index);

    this.slotData =
        this.slotData.map((slot,i)=>{

            if(i===index){

                return{

                    ...slot,

                    drawerKey:'',

                    drawerLabel:'',

                    drawerImage:'',

                    drawerType:'',

                    filled:false

                };

            }

            return slot;

        });

    this.updateDrawerCounts();

}


/*
==========================================================
RESET
==========================================================
*/

handleReset(){

    this.slotData =
        this.slotData.map(slot=>{

            return{

                ...slot,

                drawerKey:'',

                drawerLabel:'',

                drawerImage:'',

                drawerType:'',

                filled:false

            };

        });

    this.updateDrawerCounts();

}


/*
==========================================================
UPDATE COUNTS
Disable +Add when drawer reached limit
==========================================================
*/
    updateDrawerCounts(){

        let usedSlots = 0;

        this.slotData.forEach(slot=>{

            if(slot.filled){

                usedSlots +=
                    DRAWER_SLOT_SIZE[slot.drawerKey] || 1;

            }

        });

        const remaining =
            this.requiredSelections - usedSlots;

        const complete =
            remaining <= 0;

        this.drawerCards =
            this.drawerCards.map(card=>{

                const size =
                    DRAWER_SLOT_SIZE[
                        card.Option_Key__c
                    ] || 1;

                const used =
                    this.slotData.filter(

                        slot=>

                            slot.drawerKey===

                            card.Option_Key__c

                    ).length;

                return{

                    ...card,

                    addedCount:used,

                    disabled:
                        complete ||
                        size > remaining,

                    buttonLabel:
                        complete
                        ? 'Added'
                        : '+ Add'

                };

            });

    }
/*
==========================================================
DISPLAY SLOTS
==========================================================
*/

get displaySlots(){

    return this.slotData.map(slot=>{

        return{

            ...slot,

            showRemove:slot.filled

        };

    });

}

/*
==========================================================
STEP COMPLETE
==========================================================
*/

    get isStepComplete(){

        let usedSlots = 0;

        this.slotData.forEach(slot=>{

            if(slot.filled){

                usedSlots +=
                    DRAWER_SLOT_SIZE[slot.drawerKey] || 1;

            }

        });

        return usedSlots >= this.requiredSelections;

    }
/*
==========================================================
NEXT BUTTON
==========================================================
*/

get disableNext(){

    return !this.isStepComplete;

}

/*
==========================================================
NEXT
==========================================================
*/

handleNext(){

    const builderPayload =

    this.slotData.map(slot=>{

        return{

            tier: slot.id,

            key: slot.drawerKey,

            label: slot.drawerLabel,

            sku: BUILDER_SKU_MAP[slot.drawerKey] || '',

            image: slot.drawerImage

        };

    });

    const layeredPreview={

        baseImage:this.baseCartImage,

        overlays:

            this.slotData

                .filter(slot=>slot.filled)

                .map(slot=>{

                    return{

                        url:slot.drawerImage,

                        style:slot.cssStyle

                    };

                })

    };

    this.dispatchEvent(

        new CustomEvent(

            'stepcomplete',

            {

                detail:{

                    BUILDER:builderPayload,

                    BUILDER_SLOTS:this.slotData,

                    previewImage:this.baseCartImage,

                    layeredPreview

                }

            }

        )

    );

}
}