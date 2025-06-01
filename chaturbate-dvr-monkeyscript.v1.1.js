// ==UserScript==
// @name         Chaturbate DVR Monkey Script
// @namespace    https://github.com/lil-bandit/
// @version      2025-06-01
// @description  Mod for Chaturbate-DVR by teacat
// @author       You
// @match        http://localhost:8080/
// @icon         
// @grant        none
// ==/UserScript==

function Main() {

    var MY_PORT = "8080" // <--- Change to match your port

    // It seems tamper monkey does not differentiate between ports
    // So to prevent this script from running in apps on other ports, we have to do this check
    if ( window.location.port !== MY_PORT ) return null;

    //-----


    //Insert CSS
    const styleEl = document.createElement('style');
    document.head.appendChild(styleEl);
    const sheet = styleEl.sheet;

    // List item collapse
    sheet.insertRule('.collapsed.ts-box.is-horizontal > div > :not(:first-child) { display: none;}', sheet.cssRules.length);
    sheet.insertRule('.ts-box.is-horizontal.collapsed .ts-content:nth-of-type(2) { display: none !important;}', sheet.cssRules.length);
    sheet.insertRule('.collapsed.ts-box.is-horizontal > div { width: 100% !important; }', sheet.cssRules.length);

    // Header (visual hack)
    sheet.insertRule('.ts-wrap.is-vertical { margin-top:140px !important; }', sheet.cssRules.length);
    sheet.insertRule('.ts-grid.is-bottom-aligned { padding:50px; position: fixed; top: 0px; width: 100%; background: #181818; ' +
                     'padding-bottom: 30px;left: 0px; z-index:995; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45); ' +
                     'border-bottom: 3px solid #212121; }', sheet.cssRules.length);

    // Make list item smaller ( less padding )
    sheet.insertRule('.collapsed [sse-swap].ts-content { padding: 1em !important; padding-top: .9em !important }', sheet.cssRules.length);

    // Disable "Auto-Update & Scroll" checkbox
    sheet.insertRule('label.ts-switch.is-small { pointer-events: none; opacity: .5; }', sheet.cssRules.length);

    // Status badge visual fix
    sheet.insertRule('.ts-box .ts-badge { padding:.65em 1em ; padding-bottom:.7em; }', sheet.cssRules.length);

    // Status badge rollover effect
    sheet.insertRule('.ts-box .ts-badge:hover { border: 1px solid white; box-shadow: 0 0 7px 0px rgba(255,255,255,.5); }', sheet.cssRules.length);

    // Channel title rollover effect
    sheet.insertRule('.ts-box.is-horizontal > div > :first-child .ts-header:hover { text-shadow: 0 0 1px white, 0 0 10px rgba(255,255,255,.7); }', sheet.cssRules.length);

    // Channel title - disable selection
    sheet.insertRule('.ts-box.is-horizontal > div > :first-child { cursor: pointer; user-select: none; -webkit-user-select: none; -ms-user-select: none; }', sheet.cssRules.length);
  
    //-----




    //-----
    var AutoSort = (function(){

        let lastOrder = [];
        var lastUserMoved = 0;
        function getStatusPriority(el) {
            const badgeText = el.querySelector('.ts-badge')?.textContent.trim() || '';
            if (badgeText === 'RECORDING') return 0;
            if (badgeText === 'PAUSED') return 1;
            if (badgeText === 'OFFLINE') return 2;
            return 3;
        }

        function sortRowsCustom() {
            //if( new Date().getTime()-lastUserMoved < 2000 ) return; // To prevent sort from happening while using the UI

            const container = document.querySelector('.ts-wrap');
            const boxes = Array.from(container.querySelectorAll('.ts-box'));

            boxes.sort((a, b) => {
                const pa = getStatusPriority(a);
                const pb = getStatusPriority(b);
                if (pa !== pb) return pa - pb;

                const ta = a.querySelector('.ts-header')?.textContent.trim() || '';
                const tb = b.querySelector('.ts-header')?.textContent.trim() || '';
                return ta.localeCompare(tb);
            });

            // Generate current order signature (e.g. using text content)
            const newOrder = boxes.map(box => {
                const badge = box.querySelector('.ts-badge')?.textContent.trim() || '';
                const title = box.querySelector('.ts-header')?.textContent.trim() || '';
                return `${badge}:${title}`;
            });

            // Compare with previous order
            const isSameOrder = newOrder.length === lastOrder.length &&
                  newOrder.every((v, i) => v === lastOrder[i]);

            if (isSameOrder) return; // No change, skip DOM updates

            // Update DOM and cache
            boxes.forEach(box => container.appendChild(box));
            lastOrder = newOrder;

            window.htmx.trigger(document.body, 'htmx:sseRefresh');
        }

        var interval_id = setInterval(sortRowsCustom, 3000);


        /* End of AutoSort*/
        document.body.addEventListener('mousemove', function(e) {
            lastUserMoved = new Date().getTime();
        })
        return {
            sortNow: function(){
                sortRowsCustom()
            }
        }
    })()
    //-----



    //-----
    var CollapsibleItems = (function(){

        var collapseClass = "collapsed"

        function onClickCollapsibleEvent(event) {
            const box = event.target.closest('.ts-box')
            if (box) {
                if (box.classList.contains(collapseClass)) {
                    box.classList.remove(collapseClass)
                    let textarea = event.target.closest(".ts-box").querySelector("textarea")
                    //console.log("textarea", textarea)
                    textarea.scrollTop = textarea.scrollHeight
                } else {
                    box.classList.add(collapseClass);

                }
            } else {
                console.error('No parent .ts-box found for the clicked element.')
            }
            event.stopPropagation()
        }


        function onBadgeClick(el, event){
            var parent = el.closest("[sse-swap]");
            var channel_id = null
            if ( parent ) {
                let attrValue = parent.getAttribute("sse-swap");
                channel_id = attrValue.substring(0, attrValue.lastIndexOf("-"));
            } else {
                //console.log("No parent with 'sse-swap' found.");
            }
            if( !channel_id ) return null
            switch( el.textContent.trim() ) {
                case "RECORDING":
                    //console.log("RECORDING")
                    fetch('/pause_channel/'+channel_id, { method: 'POST' })
                    break;
                case "PAUSED":
                    //console.log("PAUSED")
                    fetch('/resume_channel/'+channel_id, { method: 'POST' })
                    break;
                case "OFFLINE":
                    //console.log("OFFLINE")
                    fetch('/pause_channel/'+channel_id, { method: 'POST' })
                    break;


            }
        }

        function update( sse_event ) {
            
            document.querySelectorAll( '.ts-box.is-horizontal .column.is-fluid .ts-header' ).forEach(el => {
                el.onclick = function(event) {
                    onClickCollapsibleEvent(event)
                }
            });

            document.querySelectorAll('[sse-swap] .column .ts-badge').forEach(el => {
                el.onclick = function(event){
                    onBadgeClick(this,event)
                }
            });

        }


        document.querySelectorAll('.ts-box.is-horizontal').forEach(el => {
            el.classList.add('collapsed');
        });
        
        // Attach after HTMX/SSE swaps content
        document.body.addEventListener('htmx:afterSwap', function(e) {
            //console.log("htmx:afterSwap",e)
            let sswe_id = e.detail.elt.getAttribute('sse-swap')
            if (sswe_id && sswe_id.endsWith("-info") ) {
                update(e)
            }
        });

        update( null );
        AutoSort.sortNow();

        return {
            update:function(){
                update( null )
            }
        }
        /* End of CollapsibleItems*/
    })();
    //-----



    //-----
    // For convenience allow the whole URL to be inserted when creating channel ( id will be parsed )
    setTimeout(function(){
        var el = document.querySelector('.ts-control .ts-input [name="username"]');
        if(el) {

            el.addEventListener('change', function (e) {
                let value = e.target.value.trim()
                // Only try to extract channel ID if it looks like a chaturbate URL
                if (value.includes('chaturbate.')) {
                    let match = value.match(/^(?:https?:\/\/)?(?:[a-zA-Z0-9-]+\.)?chaturbate\.[a-z.]+\/([^\/\s?#]+)/i);
                    if (match) {
                        // Replace input with just the username
                        e.target.value = match[1]
                    }
                }
                // Otherwise, leave as-is (for comma-separated IDs)
            });
        }else {
            console.log("could not attach")
        }
    },500)
    //-----

    /* End of Main*/
}

// Works both onload and as "drop-in"
document.readyState === "complete" ? Main() : window.addEventListener("load", Main);
