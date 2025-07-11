/*
 * Copyright 2017, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { Glyphicon } from 'react-bootstrap';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { createSelector } from 'reselect';

import {
    closeTutorial,
    disableTutorial,
    initTutorial,
    resetTutorial,
    startTutorial,
    toggleTutorial,
    updateTutorial
} from '../actions/tutorial';
import I18N from '../components/I18N/I18N';
import TutorialComp from '../components/tutorial/Tutorial';
import epics from '../epics/tutorial';
import { tutorialSelector } from '../selectors/tutorial';
import presetList from './tutorial/preset';

/**
 * Tutorial plugin. Enables the steps of tutorial.
 * @prop {string} cfg.preset overrides the default_tutorial with another from the preset folder
 * @prop {object} cfg.presetList overrides preset list of MapStore2
 * @prop {boolean} cfg.showCheckbox shows/hides checkbox to disable tutorial next autostart
 * @prop {object} cfg.scrollIntoViewOptions options applied to Element.scrollIntoView, {"block": "end"}
 * @prop {number} cfg.scrollOffset changes the scroll offset
 * @memberof plugins
 * @class Tutorial
 * @example
 * // preset example in localConfig
 * // overrides the default_tutorial with another from the preset folder
 * // by changing the name
 * {
 *  "name": "Tutorial",
 *  "cfg": {
 *   "preset": "home_tutorial"
 *  }
 * }
 *
 * // presetList example in localConfig
 * // overrides preset list of MapStore2
 * // note: set first step selector to ""#intro-tutorial", enables autostart of tutorial
 * {
 *  "name": "Tutorial",
 *  "cfg": {
 *   "presetList": {
 *    "default_tutorial": [
 *     {
 *      "title": "Welcome",
 *      "text": "my intro text",
 *      "selector": "#intro-tutorial"
 *     },
 *     {
 *      "translation": "myTranslation" // id from translation file,
 *      "selector": "#my-first-step-selector"
 *     },
 *     {
 *      "translationHTML": "myTranslationHTML" // id from translation file,
 *      "selector": "#my-first-step-selector"
 *     }
 *    ]
 *   }
 *  }
 * }
 *
 * // translation file example
 * ...
 *  "tutorial": {
 *   ...
 *   "myIntroTranslation": {
 *    "title": "My intro title",
 *    "text": "My intro description"
 *   },
 *    "myTranslation": {
 *    "title": "My first step title",
 *    "text": "My first step description"
 *   },
 *   "mySecondStepTranslation": {
 *    "title": "My second step title",
 *    "text": "My second step description"
 *   },
 *   "myTranslationHTML": {
 *    "title": "<div style="color:blue;">My html step title</div>",
 *    "text": "<div style="color:red;">My html step description</div>"
 *   }
 *   ...
 *  }
 * ...
 * // translation file example with actions
 * // action param could be an object or array of objects
 * // action type are triggered on tour actions and they could be `start`, `next` and `back`
 * ...
 *  "tutorial": {
 *   ...
 *   "myIntroTranslation": {
 *    "title": "My intro title",
 *    "text": "My intro description",
 *    "action": { start: { type: 'MY_START_ACTION' }}
 *   },
 *    "myTranslation": {
 *    "title": "My first step title",
 *    "text": "My first step description",
 *    "action": { back: { type: 'MY_BACK_ACTION' }}
 *   },
 *   "mySecondStepTranslation": {
 *    "title": "My second step title",
 *    "text": "My second step description",
 *    "action": { next: { type: 'MY_NEXT_ACTION' }}
 *   },
 *   "myTranslationHTML": {
 *    "title": "<div style="color:blue;">My html step title</div>",
 *    "text": "<div style="color:red;">My html step description</div>",
 *    "action": { next: [{ type: 'MY_FIRST_ACTION' }, { type: 'MY_SECOND_ACTION' }]}
 *   }
 *   ...
 *  }
 * ...
 */

const tutorialPluginSelector = createSelector([tutorialSelector],
    (tutorial) => ({
        toggle: tutorial.enabled,
        steps: tutorial.steps,
        run: tutorial.run,
        autoStart: tutorial.start,
        status: tutorial.status,
        tourAction: tutorial.tourAction,
        stepIndex: tutorial.stepIndex
    }));

const Tutorial = connect(tutorialPluginSelector, (dispatch) => {
    return {
        actions: bindActionCreators({
            onSetup: initTutorial,
            onStart: startTutorial,
            onUpdate: updateTutorial,
            onDisable: disableTutorial,
            onReset: resetTutorial,
            onClose: closeTutorial
        }, dispatch)
    };
}, (stateProps, dispatchProps, ownProps) => ({
    ...stateProps,
    ...dispatchProps,
    ...ownProps,
    presetList: {
        ...presetList,
        ...ownProps.presetList
    }
}))(TutorialComp);

export default {
    TutorialPlugin: Object.assign(Tutorial, {
        BurgerMenu: {
            name: 'tutorial',
            position: 1200,
            tooltip: "tutorial.title",
            text: <I18N.Message msgId="tutorial.title"/>,
            icon: <Glyphicon glyph="book"/>,
            action: toggleTutorial,
            priority: 2,
            doNotHide: true
        },
        SidebarMenu: {
            name: 'tutorial',
            position: 1200,
            tooltip: "tutorial.title",
            text: <I18N.Message msgId="tutorial.title"/>,
            icon: <Glyphicon glyph="book"/>,
            action: toggleTutorial,
            selector: (state) => {
                return {
                    bsStyle: state.tutorial.enabled  ? 'primary' : 'tray',
                    active: state.tutorial.enabled || false

                };
            },
            priority: 1,
            doNotHide: true
        }
    }),
    reducers: {
        tutorial: require('../reducers/tutorial').default
    },
    epics
};
