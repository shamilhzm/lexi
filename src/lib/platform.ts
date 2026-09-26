// Where this copy of Lexi was installed from, and what that rules out.
//
// ## Why a store copy differs at all
//
// The web app and a store listing are the same code under different terms. Two
// things Lexi does freely on the open web need something a store reviewer can ask
// to see (panel review, 2026-09-25; `docs/STORES.md`):
//
//  - **Stories.** The learner's browser fetches the publishers' articles for private
//    reading. That is the relationship a feed reader has, and it is how VISION
//    justifies it. An app *listing* that displays tagesschau, SRF, DW and heise text
//    is a different claim: App Store Guideline 5.2.2 requires permission from the
//    publisher, with proof on request. Until a publisher grants it in writing,
//    stories are off in store copies — and the optional tutor with them, because
//    explaining a sentence *you are reading* is the only thing it does.
//  - **The support link.** A heart labelled "Support Lexi's development" reads to a
//    reviewer as a donation ask outside in-app purchase (3.1.1), whatever it links to.
//
// Nothing here removes anything from the web app, and nothing touches a learner's
// data: topics already chosen stay stored and come back in any web copy.
//
// ## The two kinds of store copy
//
//  - **A bundled build** (Capacitor, iOS): `VITE_STORE_BUILD=1 npm run build`. The
//    flag is a literal after the build, so no launch-time signal can turn stories
//    back on. The story code is still *in* that bundle (these are function calls,
//    which the minifier does not inline); it is unreachable, not absent.
//  - **A Trusted Web Activity** (Bubblewrap, Google Play) *is* the website: same
//    deploy, same origin, same storage. It can only be told apart at runtime, by the
//    referrer Android hands the first navigation (`android-app://<package>/`).
//    Hash navigation keeps the document, but a reload or the build auto-reload can
//    drop the referrer, so the answer is remembered for the session.

const STORE_BUILD = import.meta.env.VITE_STORE_BUILD === '1';

/** sessionStorage, deliberately: it describes *this launch*, is never in a backup,
 *  and must not follow a learner from the Play app into a browser tab. */
const TWA_KEY = 'lexi.twa.v1';

/** Pure, for the test: was this launch opened by an Android app wrapper? */
export function isTwaReferrer(referrer: string): boolean {
  return /^android-app:\/\//.test(referrer);
}

function launchedFromTwa(): boolean {
  try {
    if (sessionStorage.getItem(TWA_KEY) === '1') return true;
    if (typeof document !== 'undefined' && isTwaReferrer(document.referrer)) {
      sessionStorage.setItem(TWA_KEY, '1');
      return true;
    }
  } catch { /* storage refused: fall back to the referrer alone */
    return typeof document !== 'undefined' && isTwaReferrer(document.referrer);
  }
  return false;
}

/** Is this copy distributed through an app store? */
export function isStoreCopy(): boolean {
  return STORE_BUILD || launchedFromTwa();
}

/** News stories, the topic picker, the reader and the tutor that only serves it. */
export function storiesAvailable(): boolean {
  return !isStoreCopy();
}

/** The Profile link to the project, which reads as a donation ask in a store copy. */
export function supportLinkShown(): boolean {
  return !isStoreCopy();
}
