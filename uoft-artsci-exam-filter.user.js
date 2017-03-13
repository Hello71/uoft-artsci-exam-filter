// ==UserScript==
// @name          University of Toronto Arts & Science Exam Schedule Filter
// @namespace     https://alxu.ca/
// @match         http://www.artsci.utoronto.ca/current/exams/*
// @version       1.0
// @grant         none
// @downloadURL   https://alxu.ca/uoft-artsci-exam-filter.user.js
// @require       https://www.kryogenix.org/code/browser/sorttable/sorttable.js#sha512=33bdc388d816cab2190ee33918143074a3d1bc8da315b0d6117eb8233d8a7ed51752aa26419296c06120c6faee6053d4589fca2a7590846139d69e84cb600808
// @run-at        document-end
// ==/UserScript==

/*
 * Copyright 2017 Alex Xu, released under GPLv3 or later
 *
 * Firefox: Install Greasemonkey: https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/ then (re-)open this file.
 * Chrome: Install Tampermonkey: https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo then (re-)open this file.
 * Note that installing this script directly will also work, but sorting will not be supported, and in addition, on Windows/Mac the script will be automatically and permanently disabled once Chrome restarts.
 */

(function () {
"use strict";

if (document.title.indexOf("Timetable") === -1)
    return;

var tbl = document.getElementsByClassName("vertical")[0],
    trs = tbl.querySelectorAll("tr:not(:first-child)");

var storage = localStorage.getItem("filterinfo");
if (storage)
    try {
        storage = JSON.parse(storage);
    } catch (e) {
        if (!(e instanceof SyntaxError))
            throw e;
    }

if (!storage)
    storage = {};

var parseCourses = function (mycoursesstr) {
    var mycourses = {names: [], sections: []};
    mycoursesstr.split(/[ ,;]+/).forEach(function (c) {
        // ignore empty courses
        if (c) {
            var cspl = c.split(/[\/:]+/);
            if (cspl[1])
                mycourses.sections[mycourses.names.length] = cspl[1].toUpperCase();
            mycourses.names.push(cspl[0].toUpperCase());
        }
    });
    return mycourses;
};

// the meat.
var dofilter = function (myname, mycourses) {
    var getCI = function (name) {
        return mycourses.names.findIndex(function (mycname) {
            return name.indexOf(mycname) > -1;
        });
    };

    var checkCourse = function (tr) {
        var ch = tr.children,
            s = ch[1].innerHTML;

        // if we don't have any courses, match everything instead of nothing
        if (mycourses.names.length) {
            var courseindex = getCI(ch[0].innerHTML);
            if (courseindex === -1)
                return false;

            var l = s.match(/L?[0-9]+/);
            if (l && mycourses.sections[courseindex] && l[0].indexOf(mycourses.sections[courseindex]) === -1)
                return false;
        }

        if (myname) {
            var nr = s.match(/([A-Z]+) - ([A-Z]+)/);
            if (nr && (myname < nr[1] || myname > nr[2]))
                return false;
        }

        return true;
    };

    for (var i = trs.length - 1; i >= 0; i--) {
        trs[i].style.display = checkCourse(trs[i]) ? '' : 'none';
    }
};

var ourctnr = document.createElement("div");
ourctnr.appendChild(document.createTextNode("Filter by name: "));

var makeInput = function (attr, size) {
    var input = document.createElement("input");
    input.type = "text";
    input.size = size;
    if (storage[attr])
        input.value = storage[attr];
    input.addEventListener("input", function () {
        storage[attr] = this.value.toUpperCase();
        // in theory we could cache this, but it's fast enough
        dofilter(storage.name, parseCourses(storage.courses));
        localStorage.setItem("filterinfo", JSON.stringify(storage));
    }, false);
    ourctnr.appendChild(input);
};

makeInput("name", "4");

ourctnr.appendChild(document.createTextNode(", courses: "));

makeInput("courses", "50");

ourctnr.appendChild(document.createElement("br"));
ourctnr.appendChild(document.createTextNode("Courses should be separated by spaces and sections preceded by slash."));
ourctnr.appendChild(document.createElement("br"));
ourctnr.appendChild(document.createTextNode("Example: ABC101 XYZ201/L0301"));

tbl.parentNode.insertBefore(ourctnr, tbl);

if (storage.name || storage.courses)
    window.requestAnimationFrame(function () {
        dofilter(storage.name, parseCourses(storage.courses));

        if (typeof sorttable !== "undefined") {
            sorttable.init();
            sorttable.makeSortable(tbl);
            sorttable.innerSortFunction.apply(tbl.getElementsByTagName("th")[2], []);
        }
    });

if (typeof sorttable !== "undefined")
    for (var i = trs.length - 1; i >= 0; i--) {
        var dateEl = trs[i].children[2],
            dateSplit = dateEl.innerHTML.split(" "); // ["MON", "1", "JAN"]
        dateEl.setAttribute("sorttable_customkey", dateSplit[2] + dateSplit[1]); // "JAN1"
    }

}());
