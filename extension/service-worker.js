async function getPageData(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const title = document.title || "";
      const ogSite = document.querySelector('meta[property="og:site_name"]')?.getAttribute("content") || "";
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content") || "";
      const companyMeta = document.querySelector('meta[name="company"]')?.getAttribute("content") || "";
      const locationMeta = document.querySelector('meta[name="location"]')?.getAttribute("content") || "";
      const selectedText = window.getSelection()?.toString() || "";

      const company = companyMeta || ogSite || "";
      const finalTitle = ogTitle || title;
      return {
        title: finalTitle,
        company,
        location: locationMeta,
        selectedText
      };
    },
  });
  return result;
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !tab.url) return;
  const data = await getPageData(tab.id);
  const params = new URLSearchParams();
  params.set("url", tab.url);
  if (data.title) params.set("title", data.title);
  if (data.company) params.set("company", data.company);
  if (data.location) params.set("location", data.location);

  const saveUrl = `http://localhost:3000/save?${params.toString()}`;
  await chrome.tabs.create({ url: saveUrl });
});
