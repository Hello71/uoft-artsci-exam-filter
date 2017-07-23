// ==UserScript==
// @name          University of Toronto Arts & Science Exam Schedule Filter
// @namespace     https://alxu.ca/
// @match         http://www.artsci.utoronto.ca/current/exams/*
// @version       1.4
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
 * Note that installing this script directly will also work, but sorting will not be supported, and in addition, on Windows and Mac the script will be automatically and permanently disabled once Chrome restarts.
 */

(function () {
"use strict";

if (document.title.indexOf("Timetable") === -1)
    return;

var tbl = document.getElementsByClassName("vertical")[0];

if (!tbl)
    return;

var trs = tbl.querySelectorAll("tr:not(:first-child)");

if (!trs.length)
    return;

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

var parseCourses = (mycoursesstr) => mycoursesstr
        // ignore leading, trailing, consecutive delimiters
        .split(/[ ,;]+/).filter((v) => v)
        .map((c) => c.split(/[\/:]+/))
        .map((cspl) => ({
            name: cspl[0].toUpperCase(),
            section: cspl.length > 1 ? cspl[1].toUpperCase() : null
        }));

var dofilter = function (myname, mycourses) {
    var getCourse = (name) => mycourses.find((c) => c && name.indexOf(c.name) > -1);

    var checkCourse = function (tr) {
        var ch = tr.children,
            s = ch[1].innerHTML;

        if (myname) {
            var nr = s.match(/([A-Z]+) - ([A-Z]+)/);
            if (nr && (myname < nr[1] || myname > nr[2]))
                return false;
        }

        // if we don't have any courses, match everything instead of nothing
        if (mycourses.length) {
            var course = getCourse(ch[0].innerHTML);
            if (!course)
                return false;

            if (course.section) {
                var l = s.match(/L?[0-9]+/);
                if (l && l[0].indexOf(course.section) === -1)
                    return false;
            }
        }

        return true;
    };

    for (var i = trs.length - 1; i >= 0; i--) {
        trs[i].style.display = checkCourse(trs[i]) ? '' : 'none';
    }
};

var ourctnr = document.createElement("div");
ourctnr.appendChild(document.createTextNode("Filter by name: "));

var makeInput = function (attr, size, placeholder) {
    var input = document.createElement("input");
    input.type = "text";
    input.size = size;
    input.placeholder = placeholder;
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

makeInput("name", "4", "SMIT");

ourctnr.appendChild(document.createTextNode(", courses: "));

makeInput("courses", "60", "ENG100 ECO100/101 CLA204/L0101");

ourctnr.appendChild(document.createElement("br"));
ourctnr.appendChild(document.createTextNode("For name, you should enter the first few letters of your surname (not your given name, obviously)."));
ourctnr.appendChild(document.createElement("br"));
ourctnr.appendChild(document.createTextNode("Courses should be separated by spaces and sections preceded by slash. You can omit the start or end of a field. For example: entering \"BC10 XYZ201/L0301\" for courses will show only courses containing \"BC10\" as well as section L0301 of course XYZ201."));

tbl.parentNode.insertBefore(ourctnr, tbl);

if (storage.name || storage.courses)
    window.requestAnimationFrame(function () {
        dofilter(storage.name, parseCourses(storage.courses));

        if (typeof sorttable !== "undefined") {
            for (var i = trs.length - 1; i >= 0; i--) {
                var c = trs[i].children,
                    dEl = c[2],
                    dSpl = dEl.innerHTML.split(" ");

                c[2].setAttribute("sorttable_customkey",
                    ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].indexOf(dSpl[2]) +
                    ("00" + dSpl[1]).slice(-2) +
                    ["AM", "PM", "EV"].indexOf(c[3].innerHTML.split(" ")[0]));
            }
            sorttable.init();
            sorttable.makeSortable(tbl);
            sorttable.innerSortFunction
                .apply(tbl.getElementsByTagName("th")[2], []);
        }
    });


}());
