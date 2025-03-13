const styleLink = document.createElement('link');
styleLink.href = chrome.runtime.getURL('styles/content.css');
styleLink.rel = 'stylesheet';
document.head.appendChild(styleLink);

let isSelecting = false;
let currentSelection = null;
let isMouseDown = false;

// 点击页面其他地方时隐藏按钮
document.addEventListener('mousedown', function(e) {
  if (e.target.id !== 'text-selector-floating') {
    const floatingButton = document.getElementById('text-selector-floating');
    if (floatingButton) {
      floatingButton.style.display = 'none';
    }
  }
});

// 监听来自background的状态更新
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'UPDATE_SELECTION_STATE') {
    isSelecting = request.enabled;
  }
});

// 监听选区变化事件
document.addEventListener('selectionchange', () => {
  // 移除已存在的按钮，避免重复创建
  const existingBtn = document.getElementById('text-selector-floating');
  if (existingBtn) {
    existingBtn.remove();
  }
});

// 修改点击保存按钮事件
document.addEventListener('mouseup', function(e) {
  setTimeout(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    // 移除已存在的按钮
    const existingBtn = document.getElementById('text-selector-floating');
    if (existingBtn) {
      existingBtn.remove();
    }
    
    if (selectedText && selectedText.length > 0) {
      // 获取选区位置
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // 在选区附近创建按钮
      const floatingButton = document.createElement('div');
      floatingButton.id = 'text-selector-floating';
      floatingButton.style.cssText = `
        position: absolute;
        z-index: 2147483647;
        padding: 4px 8px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 12px;
        line-height: 1;
        transition: all 0.2s ease;
        user-select: none;
        pointer-events: auto;
        white-space: nowrap;
      `;
      floatingButton.textContent = '保存选中文本';
      
      // 设置按钮位置在选区右侧
      const left = rect.right + window.scrollX + 5;
      const top = rect.top + window.scrollY - 10;
      
      // 确保按钮不会超出屏幕边界
      const buttonWidth = 100; // 估计按钮宽度
      const buttonHeight = 30; // 估计按钮高度
      
      floatingButton.style.left = `${Math.min(left, window.innerWidth - buttonWidth)}px`;
      floatingButton.style.top = `${Math.min(top, window.innerHeight - buttonHeight)}px`;
      
      // 添加鼠标悬停效果
      floatingButton.onmouseover = () => {
        floatingButton.style.background = '#45a049';
        floatingButton.style.transform = 'translateY(-1px)';
      };
      
      floatingButton.onmouseout = () => {
        floatingButton.style.background = '#4CAF50';
        floatingButton.style.transform = 'translateY(0)';
      };

      // 修改点击保存按钮事件
      floatingButton.onclick = function(event) {
        event.stopPropagation();
        
        // 立即隐藏按钮
        floatingButton.style.display = 'none';
        
        try {
          // 尝试保存到本地存储
          chrome.storage.local.get(['savedSelections'], function(result) {
            try {
              const savedSelections = result.savedSelections || [];
              savedSelections.push({
                content: selectedText,
                timestamp: new Date().toISOString(),
                url: window.location.href
              });
              
              chrome.storage.local.set({ savedSelections }, function() {
                try {
                  // 发送到 Vditor
                  sendContentToVditor(selectedText);
                  showSavedNotification();
                  // 清除选中的文本
                  window.getSelection().removeAllRanges();
                } catch (innerError) {
                  console.error('处理选中文本时出错:', innerError);
                  showErrorNotification('保存失败: ' + innerError.message);
                }
              });
            } catch (storageError) {
              console.error('存储数据时出错:', storageError);
              // 即使存储失败，仍然尝试发送到 Vditor
              sendContentToVditor(selectedText);
              showErrorNotification('本地存储失败，但已尝试发送到编辑器');
              window.getSelection().removeAllRanges();
            }
          });
        } catch (error) {
          console.error('保存选中文本时出错:', error);
          // 如果 Chrome API 失败，仍然尝试发送到 Vditor
          try {
            sendContentToVditor(selectedText);
            showSavedNotification();
            window.getSelection().removeAllRanges();
          } catch (vditorError) {
            console.error('发送到编辑器失败:', vditorError);
            showErrorNotification('保存失败: ' + error.message);
          }
        }
      };
      
      document.body.appendChild(floatingButton);
    }
  }, 10);
});

// 清理选区的函数
function clearSelection() {
  if (currentSelection) {
    window.getSelection().removeAllRanges();
    currentSelection = null;
  }
}

// 点击页面其他地方时清除浮动按钮
document.addEventListener('click', (e) => {
  const floatingBtn = document.getElementById('text-selector-floating');
  if (floatingBtn && !floatingBtn.contains(e.target)) {
    floatingBtn.remove();
    clearSelection();
  }
});

// 添加调试代码
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request);
  sendResponse('收到');
});

// 发送保存请求到后台
function saveSelection(content) {
  chrome.runtime.sendMessage(
    { type: 'SAVE_SELECTION', content },
    (response) => {
      if (!response?.success) {
        console.error('保存失败:', response?.error || '未知错误');
      }
    }
  );
}

// 在现有的选区处理逻辑中调用保存
function handleSelection() {
  const selection = window.getSelection().toString().trim();
  if (selection) {
    saveSelection(selection);
    // ... existing clear selection logic ...
  }
}

// 添加保存成功的提示
function showSavedNotification() {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #4CAF50;
    color: white;
    padding: 10px 20px;
    border-radius: 4px;
    z-index: 10000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    animation: fadeInOut 2s ease-in-out forwards;
  `;
  notification.textContent = '文本已保存';
  document.body.appendChild(notification);

  // 2秒后移除提示
  setTimeout(() => {
    document.body.removeChild(notification);
  }, 2000);
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInOut {
    0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
    20% { opacity: 1; transform: translateX(-50%) translateY(0); }
    80% { opacity: 1; transform: translateX(-50%) translateY(0); }
    100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
  }
`;
document.head.appendChild(style);

// 向 Vditor 编辑器发送内容的函数
function sendContentToVditor(content) {
  try {
    const currentUrl = window.location.href;
    // const content5 = content.substring(0, 10) + (content.length > 10 ? '...' : '');
    const contentWithSource = `${content}\n\n$\\color{blue}{From}$ [${currentUrl}](${currentUrl})\n\n`;
    // 通过 chrome.runtime.sendMessage 发送消息到 background script
    chrome.runtime.sendMessage({
      action: 'sendToVditor',
      content: contentWithSource,
      targetUrl: 'http://localhost:8081/workerspace?wid=38a8c679-8c2f-425c-baa0-2ee29810183f'
    }, function(response) {
      if (chrome.runtime.lastError) {
        console.error('发送消息到 background 失败:', chrome.runtime.lastError);
        showErrorNotification('发送失败: ' + chrome.runtime.lastError.message);
        return;
      }
      
      if (response && response.success) {
        console.log('内容已发送到 Vditor');
      } else {
        console.error('发送到 Vditor 失败:', response ? response.error : '未知错误');
        showErrorNotification('发送失败: ' + (response ? response.error : '未知错误'));
      }
    });
    
    return true;
  } catch (error) {
    console.error('发送内容到 Vditor 失败:', error);
    showErrorNotification('发送失败: ' + error.message);
    return false;
  }
}

// 监听 Vditor 响应消息
window.addEventListener('message', function(event) {
  try {
    // 检查消息类型
    if (event.data && event.data.type === 'VDITOR_INSERT_RESPONSE') {
      console.log('收到 Vditor 响应:', event.data);
      
      if (event.data.success) {
        showSavedNotification(); // 复用现有的通知函数
        console.log('内容已成功插入到编辑器');
      } else {
        console.error('插入内容失败:', event.data.error);
        // 显示错误通知
        showErrorNotification('插入失败：' + (event.data.error || '未知错误'));
      }
    }
  } catch (error) {
    console.error('处理 Vditor 响应时出错:', error);
  }
}, false);

// 添加错误通知函数
function showErrorNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #f44336;
    color: white;
    padding: 10px 20px;
    border-radius: 4px;
    z-index: 10000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    animation: fadeInOut 2s ease-in-out forwards;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    document.body.removeChild(notification);
  }, 2000);
}
