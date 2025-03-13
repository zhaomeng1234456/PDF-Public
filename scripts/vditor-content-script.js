// Vditor 编辑器页面的内容脚本
console.log('Vditor 内容脚本已加载');

// 监听来自 background script 的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Vditor 页面收到消息:', request);
  
  if (request.type === 'VDITOR_INSERT_CONTENT') {
    try {
      // 获取要插入的内容
      const content = request.content;
      
      // 通过 window.postMessage 将内容传递给页面中的 plugin-note.ts
      window.postMessage({
        type: 'VDITOR_INSERT_CONTENT',
        content: content,
        timestamp: request.timestamp
      }, '*');
      
      // 设置一个超时，等待页面响应
      let responseReceived = false;
      
      // 监听页面的响应
      const messageListener = function(event) {
        if (event.data && event.data.type === 'VDITOR_INSERT_RESPONSE') {
          responseReceived = true;
          window.removeEventListener('message', messageListener);
          
          if (event.data.success) {
            console.log('Vditor 内容插入成功');
            sendResponse({ success: true });
          } else {
            console.error('Vditor 内容插入失败:', event.data.error);
            sendResponse({ success: false, error: event.data.error });
          }
        }
      };
      
      window.addEventListener('message', messageListener);
      
      // 设置超时，防止无限等待
      setTimeout(function() {
        if (!responseReceived) {
          window.removeEventListener('message', messageListener);
          console.error('等待 Vditor 响应超时');
          sendResponse({ success: false, error: '等待响应超时' });
        }
      }, 5000);
      
      return true; // 保持消息通道开放用于异步响应
    } catch (error) {
      console.error('处理 Vditor 插入请求时出错:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  
  return true;
}); 