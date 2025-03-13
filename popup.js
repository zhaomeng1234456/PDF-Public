document.addEventListener('DOMContentLoaded', () => {
  const contentDiv = document.getElementById('selectedContent');

  // 隐藏不需要的元素
  if (document.getElementById('status')) {
    document.getElementById('status').style.display = 'none';
  }
  if (document.getElementById('toggleSelection')) {
    document.getElementById('toggleSelection').style.display = 'none';
  }

  // 创建内容容器
  const createContentItem = (text, timestamp, index, url) => {
    const div = document.createElement('div');
    div.className = 'content-item';
    div.innerHTML = `
      <div class="content-text">${text}</div>
      <div class="content-meta">
        <span class="content-time">${new Date(timestamp).toLocaleString()}</span>
        <button class="delete-btn" data-index="${index}">×</button>
        <button class="send-btn" data-index="${index}" style="
          margin-right: 8px;
          padding: 2px 8px;
          background: #1890ff;
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;">发送</button>
      </div>
      <div class="content-url">
        <a href="${url}" title="${url}" target="_blank" style="color: #666; font-size: 12px; text-decoration: none; overflow: hidden; text-overflow: ellipsis; display: block; white-space: nowrap;">${url}</a>
      </div>
    `;
    return div;
  };

  // 增强版加载内容
  function loadSavedContent() {
    chrome.storage.local.get(['savedSelections'], (result) => {
      contentDiv.innerHTML = ''; // 清空旧内容
      
      if (result.savedSelections?.length) {
        // 先进行排序
        const sortedSelections = result.savedSelections
          .map((item, originalIndex) => ({...item, originalIndex}))  // 保存原始索引
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // 按时间倒序

        sortedSelections.forEach((item, idx) => {
          contentDiv.appendChild(createContentItem(
            item.content, 
            item.timestamp, 
            item.originalIndex,  // 使用原始索引
            item.url || '未知来源'
          ));
          
          // 在每个项目后添加分割线，除了最后一个
          if (idx < sortedSelections.length - 1) {
            const divider = document.createElement('hr');
            divider.style.cssText = `
              margin: 10px 0;
              border: none;
              height: 1px;
              background-color: #e0e0e0;
            `;
            contentDiv.appendChild(divider);
          }
        });
      } else {
        contentDiv.textContent = '暂无保存内容';
      }
    });
  }

  // 新增：实时监听存储变化
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.savedSelections) {
      loadSavedContent();
    }
  });

  // 初始化加载
  loadSavedContent();

  // 监听内容更新
  chrome.runtime.onMessage.addListener((request) => {
    if (request.type === 'CONTENT_UPDATED') {
      updateContentDisplay(request.selections);
    }
  });

  function updateContentDisplay(selections) {
    // 清空现有内容
    contentDiv.innerHTML = '';
    
    if (selections.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-message';
      emptyMessage.textContent = '还没有保存的内容';
      emptyMessage.style.cssText = `
        padding: 20px;
        text-align: center;
        color: #666;
        font-style: italic;
      `;
      contentDiv.appendChild(emptyMessage);
      return;
    }

    // 显示所有保存的内容
    selections.forEach((item, index) => {
      const entry = document.createElement('div');
      entry.className = 'content-entry';
      
      // 创建内容容器
      const contentText = document.createElement('div');
      contentText.className = 'content-text';
      contentText.textContent = item.content;
      
      // 创建URL容器
      const urlContainer = document.createElement('div');
      urlContainer.className = 'content-url';
      urlContainer.style.cssText = `
        margin-top: 5px;
        font-size: 12px;
        color: #666;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `;
      
      // 创建URL链接
      const urlLink = document.createElement('a');
      urlLink.href = item.url || '#';
      urlLink.textContent = item.url || '未知来源';
      urlLink.title = item.url || '未知来源';
      urlLink.target = '_blank';
      urlLink.style.cssText = `
        color: #666;
        text-decoration: none;
      `;
      urlContainer.appendChild(urlLink);
      
      // 创建时间容器
      const timeContainer = document.createElement('div');
      timeContainer.className = 'content-time';
      timeContainer.textContent = new Date(item.timestamp).toLocaleString();
      timeContainer.style.cssText = `
        margin-top: 5px;
        font-size: 12px;
        color: #888;
      `;
      
      // 创建删除按钮
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = '删除';
      deleteBtn.dataset.index = index;  // 使用data-index属性存储索引
      
      // 创建发送按钮
      const sendBtn = document.createElement('button');
      sendBtn.className = 'send-btn';
      sendBtn.textContent = '发送';
      sendBtn.dataset.index = index;  // 使用data-index属性存储索引
      sendBtn.style.cssText = `
        margin-right: 8px;
        padding: 2px 8px;
        background: #1890ff;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
      `;
      
      // 设置样式
      entry.style.cssText = `
        padding: 10px;
        margin: 8px 0;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        background: #fff;
      `;
      
      contentText.style.cssText = `
        word-break: break-all;
      `;
      
      deleteBtn.style.cssText = `
        padding: 4px 8px;
        background: #ff4444;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 12px;
        float: right;
        margin-top: 5px;
      `;
      
      // 添加所有元素到条目中
      entry.appendChild(contentText);
      entry.appendChild(timeContainer);
      entry.appendChild(urlContainer);
      entry.appendChild(deleteBtn);
      entry.appendChild(sendBtn);
      contentDiv.appendChild(entry);
      
      // 在每个项目后添加分割线，除了最后一个
      if (index < selections.length - 1) {
        const divider = document.createElement('hr');
        divider.style.cssText = `
          margin: 15px 0;
          border: none;
          height: 1px;
          background-color: #e0e0e0;
        `;
        contentDiv.appendChild(divider);
      }
    });
  }

  function deleteEntry(index) {
    chrome.storage.local.get(['savedSelections'], (result) => {
      const updated = result.savedSelections.filter((_, i) => i !== index);
      chrome.storage.local.set({ savedSelections: updated }, () => {
        loadSavedContent(); // 删除后立即重新加载内容
      });
    });
  }

  // 统一使用事件委托处理删除
  contentDiv.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
      const index = parseInt(e.target.dataset.index);
      if (!isNaN(index)) {
        deleteEntry(index);
      }
    }
  });
}); 