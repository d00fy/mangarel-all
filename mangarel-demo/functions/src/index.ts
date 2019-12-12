import * as functions from 'firebase-functions';
import admin from 'firebase-admin';
import puppeteer from 'puppeteer'; //スクレイピング用ライブラリ

import { collectionName } from './services/mangarel/constants';
import { feedCalendar } from './crawlers/kodansha-calendar';
import { saveFeedMemo } from './firestore-admin/feed-memo';
//ここら辺はcloud functionsの機能と関係ない純粋な関数ファイルをこのファイルで使用するために呼び出している感じか、、(ここでcloud functions的なことが使用できるのは、一行目で読み込んでいるからか。)

//clowler関連
const PUPPETEER_OPTIONS = {
    args: [
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--no-first-run',
        '--no-sandbox',
        '--no-zygote',
        '--single-process',
    ],
    headless: true,
};
//

admin.initializeApp();

export const publishers = functions
    .region('asia-northeast1')
    .https.onRequest(async (req, res) => {
        const snap = await admin
            .firestore()
            .collection(collectionName.publishers)
            .get();
        const data = snap.docs.map(doc => doc.data());
        res.send({ data });
    });

//crawler関連
export const fetchCalendar = functions
    .region('asia-northeast1')
    // .runWith({
    //     timeoutSeconds: 300,
    //     memory: '2GB',
    // })
    // .pubsub.schedule('0 2 1,10,20 * *')
    // .timeZone('Asia/Tokyo')
    // .onRun  現状のプランだとこのスケジュール関数が使えない。
    .https.onRequest(async () => {
        const browser = await puppeteer.launch(PUPPETEER_OPTIONS);
        const page = await browser.newPage();
        const db = admin.firestore();

        const memos = await feedCalendar(page);
        const fetchCount = await saveFeedMemo(db, memos, 'kodansha');

        await browser.close();
        console.log(`Fetched Kodansha calendar. Wrote ${fetchCount} memos.`);
    });
    //


