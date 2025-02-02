const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const app = express();
app.use(cors());

const chromeOptions = {
  headless: true,
  defaultViewport: null,
  args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--disable-features=site-per-process",
      "--no-zygote",
      "--single-process"
  ],
};

const getVideoInfo = async (videoURL) => {
  const browser = await puppeteer.launch(chromeOptions);
  try {
    const page = await browser.newPage();
    await page.goto('https://yt5s.com', { waitUntil: 'networkidle2', timeout: 60000 });

    await page.waitForSelector('input[name=q]', { visible: true });
    const inputField = await page.$('input[name=q]');
    await inputField.click({ clickCount: 3 });
    await inputField.type(videoURL, { delay: 100 });

    await page.waitForSelector('button.btn-red', { visible: true });
    await page.click('button.btn-red');

    await page.waitForSelector('div.thumbnail > img[src]', { timeout: 10000 });

    const thumbnail = await page.$eval('.thumbnail img[src]', img => img.getAttribute('src'));
    const title = await page.$eval('.clearfix h3', e => e.innerText);
    const channel = await page.$eval('.clearfix p', el => el.innerText);
    const length = await page.$eval('.clearfix p.mag0', el => el.innerText);
    
    const formats = await page.$$eval('select#formatSelect option', (options) =>
      options.map(option => ({
        value: option.value,
        format: option.parentElement.label,
        size: option.textContent.split(" ").slice(1, 3).join(" ")
      }))
    );

    console.log("[VIDEO FOUND]", title);
    return { thumbnail, title, channel, length, formats };

  } catch (err) {
    console.log("[VIDEO INFO] Error:", err.message);
    return { error: err.message };
  } finally {
    await browser.close();
  }
};

const getVideoLink = async (videoURL, value, format) => {
  const browser = await puppeteer.launch(chromeOptions);
  try {
    const page = await browser.newPage();
    await page.goto('https://yt5s.com', { waitUntil: 'networkidle2', timeout: 60000 });

    await page.waitForSelector('input[name=q]', { visible: true });
    const inputField = await page.$('input[name=q]');
    await inputField.click({ clickCount: 3 });
    await inputField.type(videoURL, { delay: 100 });

    await page.waitForSelector('button.btn-red', { visible: true });
    await page.click('button.btn-red');

    await page.waitForSelector('div.thumbnail', { timeout: 10000 });

    await page.waitForSelector(`select#formatSelect optgroup[label="${format}"] option[value="${value}"]`);
    await page.select('select#formatSelect', value);

    await page.waitForSelector('button#btn-action', { visible: true });
    await page.click('button#btn-action');

    await page.waitForSelector('a.form-control.mesg-convert.success', { visible: true });
    const videoLink = await page.$eval('a.form-control.mesg-convert.success', el => el.href);

    console.log(`Downloading video: ${videoURL}, Quality: ${value}, Format: ${format}`);
    return videoLink;

  } catch (err) {
    console.log("[DOWNLOAD ERROR]", err.message);
    return null;
  } finally {
    await browser.close();
  }
};

app.get('/', (req, res) => res.send("Server started"));

app.get('/download', async (req, res) => {
  const { url, v, f } = req.query;
  const videoLink = await getVideoLink(url, v, f);
  videoLink ? res.redirect(videoLink) : res.send({ code: 404 });
});

app.get('/getVideo', async (req, res) => {
  const { url } = req.query;
  const videoData = await getVideoInfo(url);
  res.send(videoData);
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server is running on port ${port}`));
