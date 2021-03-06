console.log( "=== +emoji background load ===" )

/***********************
 * Variable
 ***********************/

const storage = {
    version : "1.1.0",
    message_id: 0,
    popup   : "popup",
    blank   : false,
    clip    : false,
    clicked : false,
    menu    : true,
    one     : true,
    recent  : "",
    // (::|[\uff1a]{2})([\u4e00-\u9fa5]|[a-zA-Z ])+ $
    trigger_prefix: "",
    trigger_suffix: "",
    blacklist: [
        "twitter.com",
        "google.com"
    ]
};

/***********************
 * Analytics
 ***********************/

/**
 * Google Analytics 
 */
analytics();
function analytics() {
    (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
    (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
    m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
    })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');        
    ga('create', 'UA-405976-10', 'auto');
    ga('send', 'pageview');
}

/***********************
 * Version
 ***********************/

version();
function version() {
    if ( localStorage.version != storage.version ) {
        const state = localStorage.version == undefined ? "first" : "update";
        chrome.tabs.create({
            url: chrome.runtime.getURL( "options/options.html?" ) + `${state}=${storage.version}`
        });
        localStorage.version = storage.version;
    }
}

/***********************
 * Initialize
 ***********************/

initialize();
chrome.runtime.onMessage.addListener( listener );

/**
 * Conver local storage
 * 
 * @param {object} local storage
 */
function conver( object ) {
    const news = { ...object };
    Object.keys( news ).forEach( key => {
        news[key] == "true"  && ( news[key] = true );
        news[key] == "false" && ( news[key] = false );
    });
    return news;
}

/**
 * Initialize
 */
function initialize() {
    Object.keys( storage ).forEach( key => {
        localStorage[key] == undefined && ( localStorage[key] = storage[key] );
    });
    console.log( localStorage )
}

/**
 * Lister chorme message
 * 
 * @param {object} request
 * @param {object} sender
 * @param {object} sendResponse
 */
function listener( request, sender, sendResponse ) {
    if ( request == "get_settings" ) {
        sendResponse( conver( localStorage ));
    } else if ( request && request.id == "popup" ) {
        localStorage.popup = request.value;
        localStorage.popup == "popup" ? removeWindow() : createWindow();
        localStorage.popup == "popup" ? chrome.browserAction.setPopup({ popup: popup_url }) : chrome.browserAction.setPopup({ popup: "" });
    } else if ( request && request.id == "set_settings" ) {
        Object.keys( request.value ).forEach( key => {
            localStorage[key] = request.value[key];
        });
        localStorage.menu == "false" ? removeMenu() : createMenu();
    } else if ( request && request.id == "clear_settings" ) {
        localStorage.clear();
        initialize();
    } else if ( request && request.id == "analytics" ) {
        ga( "send", {
            hitType      : "event",
            eventCategory: request.value.eventCategory,
            eventAction  : request.value.eventAction,
        });
    }
}

/***********************
 * Emoji pasting
 ***********************/

// listen to other tabs, last one always overwrites the others
chrome.runtime.onMessage.addListener(function (message) {
    if (message.name == "input_deselected") {
        localStorage.message_id = 0;
    }
    else if (message.name == "input_selected") {
        localStorage.message_id = message.id;
    }
});

// changing tabs should invalidate pending messages
chrome.tabs.onActivated.addListener(function () {
    localStorage.message_id = 0;
});

/***********************
 * Browser action
 ***********************/

const popup_url = "popup/popup.html";
let   popup     = {};

chrome.browserAction.onClicked.addListener( function( event ) {
    if ( popup && popup.id ) {
        removeWindow();
    } else {
        createWindow();
    }
});

chrome.windows.onRemoved.addListener( function( windowId ) {
    if ( windowId == popup.id ) popup = {};
});

/**
 * Create popup window
 */
function createWindow() {
    chrome.tabs.create({
        url        : chrome.extension.getURL( popup_url ),
        active     : false
    }, function ( tab ) {
        chrome.windows.create({
            tabId  : tab.id,
            type   : "popup",
            focused: true,
            width  : 410, height : 350,
        }, function ( window ) { popup = window; });
    });
}

/**
 * Remove popup window
 */
function removeWindow() {
    chrome.windows.remove( popup.id );
    popup = {};
}

localStorage.popup == "popup" ? chrome.browserAction.setPopup({ popup: popup_url }) : chrome.browserAction.setPopup({ popup: "" });

/***********************
 * Menu
 ***********************/

/**
 * Create menu
 */
function createMenu() {
    chrome.contextMenus.create({
        id       : "rightclick",
        title    : "+Emoji",
        contexts : [ "editable" ]
    });
}

/**
 * Remove menu
 */
function removeMenu() {
    chrome.contextMenus.remove( "rightclick" );
}

createMenu();
chrome.contextMenus.onClicked.addListener( function( info, tab ) {
    console.log( info, tab )
    chrome.tabs.sendMessage(
        tab.id, {type: info.menuItemId}
    );
});