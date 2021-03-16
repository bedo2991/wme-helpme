// ==UserScript==
// @name         WME HelpME
// @namespace    wme-champs-it
// @version      0.3
// @description  Help users to edit the Waze map
// @author       bedo2991 @ Waze
// @updateURL	 https://github.com/bedo2991/wme-helpme/raw/main/helpme.user.js
// @supportURL   https://github.com/bedo2991/wme-helpme/issues
// @include      /^https:\/\/(www|beta)\.waze\.com(\/\w{2,3}|\/\w{2,3}-\w{2,3}|\/\w{2,3}-\w{2,3}-\w{2,3})?\/editor\b/
// @grant        none
// @require      https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// ==/UserScript==

/* global $, W, WazeWrap*/

(function WME_HelpME() {
    'use strict';
    const VERSION = GM_info.script.version;
    const form = "1FAIpQLSfisq1tPuZ3DVYIj2JJgs6YQdY_E93oNHjNUdExwTUflyb-Vw";

    const safeAlert = (level, message) => {
        try {
            WazeWrap.Alerts[level](GM_info.script.name, message);
        } catch (e) {
            console.error(e);
            alert(message);
        }
    };

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async function waitForWazeModel() {
        let trials = 1;
        let sleepTime = 150;
        do {
            if (!W || !W.map || !W.model) {
                console.log('HelpME: Waze model not ready, retrying in 800ms');
                await sleep(sleepTime * trials);
            } else {
                return true;
            }
        } while (trials++ <= 30);
        throw new Error('HelpME: could not find the Waze Model');
    }

    async function waitForWazeWrap() {
        let trials = 1;
        let sleepTime = 150;
        do {
            if (
                !WazeWrap ||
                !WazeWrap.Ready
            ) {
                console.log('HelpME: WazeWrap not ready, retrying in 800ms');
                await sleep(trials * sleepTime);
            } else {
                return true;
            }
        } while (trials++ <= 30);
        console.error('HelpME: could not initialize WazeWrap');
        throw new Error('HelpME: could not initialize WazeWrap');
    }

    async function bootstrapHelpMe(trials = 0) {
        // Check all requisites for the script
        await waitForWazeModel()
            .then((res) => {
            if (res === true) {
                initHelpME();
            }
        }).catch((e) => {
            console.error(e);
            safeAlert(
                'error',
                'HelpME failed to initialize. Please check that you have the latest version installed and then report the error on the Waze forum. Thank you!'
            );
        });
    }

    function initWazeWrapElements(){
        new WazeWrap.Interface.Shortcut(
            'unlockRequest_HelpME',
            'Create Unlock/Edit Request',
            'HelpMe',
            'HelpMe',
            'A+u',
            () => {
                doRequest();
            },
            null
        ).add();
        safeAlert('info', 'Seleziona qualcosa e premi ALT+u per fare una richiesta di sblocco. Puoi personalizzare la scorciatoia dal menù delle scorciatoie sulla barra in basso.');
    }

    function initHelpME() {
        waitForWazeWrap().then((result) => {
            if (result === true) {
                initWazeWrapElements();
            }
        });

    }

    function getMaxLockLevel(){
        const selected = W.selectionManager.getSelectedFeatures();
        if(selected.length === 1){
            return selected[0].model.attributes.lockRank ?? selected[0].model.attributes.rank;
        }
            let maxElement = selected.reduce((prev,current) => prev.model.getLockRank() > current.model.getLockRank() ? prev : current);
            return maxElement.model.getLockRank();
        }

        function doRequest(){
            if(!W.selectionManager.hasSelectedFeatures()) {
                safeAlert('error', "You must select something before sending a request");
                return;
            }
            const val = {
                'username' : WazeWrap.User.Username(),
                'permalink' : document.querySelector('a.permalink').href,
                'sendPM' : getYesNo(false),
                'user_rank' : WazeWrap.User.Rank(),
                'maxLockLevel' : getMaxLockLevel() + 1,
                'stateName' : W.model.getTopState().name,
                'cityName' : W.model.cities.get(W.model.getTopCityId())?.attributes?.name,
            };
                val.editForMe = getYesNo(val.user_rank >= val.maxLockLevel)

                const fields = {
                'username' : 'entry.2462026',
                'permalink' : 'entry.1000006',
                'editForMe' : 'entry.1000008',
                'sendPM' : 'entry.1000010',
                'user_rank' : 'entry.1000009',
                'maxLockLevel' : 'entry.1000002',
                'stateName' : 'entry.1000005',
                'cityName' : 'entry.1000007',
            };
            let formURL = `https://docs.google.com/forms/d/e/${form}/viewform?usp=pp_url`;
            for(const key in fields){
                if(val[key]){
                    formURL += `&${fields[key]}=${encodeURIComponent(val[key])}`;
                }
            }

            //Open the form in a new tab
            window.open(formURL, '_blank');
        }

        function getYesNo(b){
            return b ? "Sì":"No";
        }

        bootstrapHelpMe();
    })();
