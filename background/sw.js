// 默认开启划词模式
let selectionEnabled = true;

// 初始化存储
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['savedSelections'], (result) => {
    if (!result.savedSelections) {
      chrome.storage.local.set({ savedSelections: [] });
    }
  });
});

// 当新标签页打开时，发送启用状态
chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.sendMessage(activeInfo.tabId, {
    type: 'UPDATE_SELECTION_STATE',
    enabled: true
  });
});

// 消息处理中心
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_SELECTION_STATE') {
    sendResponse(true);
    return true;
  }
  
  if (request.type === 'SAVE_SELECTION') {
    chrome.storage.local.get(['savedSelections'], (result) => {
      const savedSelections = result.savedSelections || [];
      const newSelection = {
        content: request.content,
        timestamp: new Date().toISOString()
      };
      
      // 添加新内容并保存
      const updatedSelections = [...savedSelections, newSelection];
      chrome.storage.local.set({ savedSelections: updatedSelections }, () => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError });
        } else {
          sendResponse({ success: true });
        }
      });
    });
    return true; // 保持消息通道开放用于异步响应
  }

  if (request.type === 'DELETE_SELECTION') {
    chrome.storage.local.get(['savedSelections'], (result) => {
      const updated = result.savedSelections.filter((_, i) => i !== request.index);
      chrome.storage.local.set({ savedSelections: updated }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
  
  // 处理发送到 Vditor 的请求
  if (request.action === 'sendToVditor') {
    const targetUrl = request.targetUrl || 'http://localhost:8081';
    const urlPattern = targetUrl.split('?')[0]; // 移除查询参数
    
    // 查找匹配的标签页
    chrome.tabs.query({ url: urlPattern + '*' }, function(tabs) {
      if (tabs.length === 0) {
        // 没有找到匹配的标签页，尝试打开一个新标签页
        chrome.tabs.create({ url: targetUrl, active: false }, function(tab) {
          // 等待标签页加载完成
          setTimeout(() => {
            sendMessageToVditorTab(tab.id, request.content, sendResponse);
          }, 2000); // 给页面加载留出时间
        });
      } else {
        // 找到匹配的标签页，发送消息
        sendMessageToVditorTab(tabs[0].id, request.content, sendResponse);
      }
    });
    
    return true; // 保持消息通道开放用于异步响应
  }
});

// 发送消息到 Vditor 标签页
function sendMessageToVditorTab(tabId, content, sendResponse) {
  chrome.tabs.sendMessage(tabId, {
    type: 'VDITOR_INSERT_CONTENT',
    content: content,
    timestamp: new Date().getTime()
  }, function(response) {
    if (chrome.runtime.lastError) {
      console.error('发送到 Vditor 标签页失败:', chrome.runtime.lastError);
      sendResponse({ success: false, error: chrome.runtime.lastError.message });
      return;
    }
    
    if (response && response.success) {
      sendResponse({ success: true });
    } else {
      sendResponse({ 
        success: false, 
        error: response ? response.error : '未收到 Vditor 响应'
      });
    }
  });
}
