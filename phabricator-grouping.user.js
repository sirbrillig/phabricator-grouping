// ==UserScript==
// @name         Phabricator Notification Grouping
// @namespace    https://github.com/sirbrillig/phabricator-grouping
// @version      1.0
// @description  Allows collapsing Phabricator notifications to one-per-revision
// @author       Payton Swick <payton@foolord.com>
// @match        https://code.a8c.com/notification/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    let collapsedState = false;
    function getRevisionFromNotificationNode(node) {
        const idNode = node.querySelector('.phui-handle:nth-of-type(2)');
        return idNode ? idNode.getAttribute('href') : null;
    }
    function createNoteFromNotificationNode(node) {
        return {
            node,
            id: getRevisionFromNotificationNode(node),
            collapsed: false,
            styleCopy: {
                maxHeight: node.style.maxHeight,
                overflow: node.style.overflow,
                padding: node.style.padding,
                border: node.style.border,
            },
        };
    }
    function groupNotesById(notes) {
        return notes.reduce((grouped, note) => {
            if (! note.id) {
                return grouped;
            }
            if (! grouped[note.id]) {
                grouped[note.id] = {notes:[]};
            }
            grouped[note.id].notes.push(note);
            return grouped;
        }, {});
    }
    function changeNoteStyle(note, key, value) {
        note.styleCopy[key] = note.node.style[key];
        note.node.style[key] = value;
    }
    function restoreNoteStyle(note, key) {
        note.node.style[key] = note.styleCopy[key];
    }
    function addCollapsedMarkerToNode(node) {
        const collapsedMarker = document.createElement('div');
        collapsedMarker.innerText = '⇥ ';
        collapsedMarker.style.display = 'inline';
        collapsedMarker.style.padding = '0 2px 0 2px';
        collapsedMarker.title = 'This Revision has multiple notifications';
        collapsedMarker.className = 'phabricator-notification-grouping-collapsed';
        node.insertBefore(collapsedMarker, node.firstChild);
    }
    function removeCollapsedMarkerFromNode(node) {
        const collapsedMarker = node.querySelector('.phabricator-notification-grouping-collapsed');
        if (collapsedMarker) {
            node.removeChild(collapsedMarker);
        }
    }
    function collapseNote(note) {
        changeNoteStyle(note, 'maxHeight', 0);
        changeNoteStyle(note, 'overflow', 'hidden');
        changeNoteStyle(note, 'padding', 0);
        changeNoteStyle(note, 'border', 'none');
        note.collapsed = true;
        return note;
    }
    function expandNote(note) {
        restoreNoteStyle(note, 'maxHeight');
        restoreNoteStyle(note, 'overflow');
        restoreNoteStyle(note, 'padding');
        restoreNoteStyle(note, 'border');
        removeCollapsedMarkerFromNode(note.node);
        note.collapsed = false;
        return note;
    }
    function collapseNoteGroup(notes) {
        if (notes.length < 2) {
            return notes;
        }
        addCollapsedMarkerToNode(notes[0].node);
        return [
            notes.slice(0,1),
            notes.slice(1).map(collapseNote),
        ];
    }
    function collapseNotificationsByRevision(notes) {
        const groups = groupNotesById(notes);
        Object.values(groups).map(group => collapseNoteGroup(group.notes));
        return notes;
    }
    function expandNotifications(notes) {
        return notes.map(expandNote);
    }
    function toggleCollapsedNotes(notes) {
        if (getCollapsedState()) {
            return expandNotifications(notes);
        }
        return collapseNotificationsByRevision(notes);
    }
    function addCollapseToggleButton() {
        const button = document.createElement('a');
        button.className = 'button button-grey has-text phui-button-default msl phui-header-action-link';
        button.href = '#';
        const buttonTitle = document.createElement('div');
        buttonTitle.className = 'phui-button-text';
        buttonTitle.innerText = 'Group Notifications';
        button.appendChild(buttonTitle);
        const buttonArea = document.querySelector('.phui-header-action-links');
        if (buttonArea) {
            buttonArea.appendChild(button);
        }
        return button;
    }
    function toggleCollapsedButton(button, isCollapsed) {
        button.querySelector('.phui-button-text').innerText = isCollapsed ? 'Expand Notifications' : 'Group Notifications';
    }
    function getCollapsedState() {
        try {
            return localStorage.getItem('phabricator-notification-grouping-is-collapsed') === 'true' || false;
        } catch (err) {
            return collapsedState; // NOTE: module global variable
        }
    }
    function setCollapsedState(isCollapsed) {
        collapsedState = isCollapsed; // NOTE: module global variable
        try {
            localStorage.setItem('phabricator-notification-grouping-is-collapsed', isCollapsed);
        } catch (err) {
        }
    }
    // ------- Main Program -------
    let notes = Array.from(document.querySelectorAll('.phabricator-notification')).map(createNoteFromNotificationNode);
    const button = addCollapseToggleButton();
    button.addEventListener('click', () => {
        setCollapsedState(! getCollapsedState());
        notes = toggleCollapsedNotes(notes);
        toggleCollapsedButton(button, getCollapsedState());
    });
    if (getCollapsedState()) {
        notes = toggleCollapsedNotes(notes);
        toggleCollapsedButton(button, getCollapsedState());
    }
})();
