// 声明全局类型
export {};

declare global {
    interface Window {
        insertToEditor: (content: string) => void;
    }
}

// 在包含 Vditor 编辑器的页面中添加以下代码
window.addEventListener('message', function(event) {
    try {
        // 检查消息格式
        if (!event.data || typeof event.data !== 'object') {
            return;
        }

        if (event.data.type === 'VDITOR_INSERT_CONTENT') {
            console.log('Vditor 收到插入内容请求:', event.data);
            
            // 获取要插入的内容
            const content = event.data.content;
            
            // 调用编辑器的插入函数
            if (window.insertToEditor && typeof window.insertToEditor === 'function') {
                window.insertToEditor(content);
                
                // 发送成功响应
                window.postMessage({
                    type: 'VDITOR_INSERT_RESPONSE',
                    success: true,
                    timestamp: event.data.timestamp // 返回相同的时间戳以便匹配请求
                }, '*');
                
                console.log('Vditor 内容插入成功');
            } else {
                console.error('Vditor 插入失败: insertToEditor 函数未找到');
                
                // 发送失败响应
                window.postMessage({
                    type: 'VDITOR_INSERT_RESPONSE',
                    success: false,
                    error: 'insertToEditor function not found',
                    timestamp: event.data.timestamp
                }, '*');
            }
        }
    } catch (error) {
        console.error('Vditor 处理消息时发生错误:', error);
        
        // 发送错误响应
        window.postMessage({
            type: 'VDITOR_INSERT_RESPONSE',
            success: false,
            error: error.message,
            timestamp: event.data?.timestamp
        }, '*');
    }
}, false);