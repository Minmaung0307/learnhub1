// /public/js/core/fs-helpers.js
import { db } from "../firebase.js";
import {
  collection,
  doc,
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

function _checkSegments(segments) {
  if (!segments.length) throw new Error("fs-helpers: missing path segments");
  const bad = segments.find((s) => s === undefined || s === null || s === "");
  if (bad !== undefined) {
    throw new Error("fs-helpers: bad segment in " + JSON.stringify(segments));
  }
}

export const col = (...segments) => {
  _checkSegments(segments);
  return collection(db, ...segments);
};

export const ref = (...segments) => {
  _checkSegments(segments);
  return doc(db, ...segments);
};
