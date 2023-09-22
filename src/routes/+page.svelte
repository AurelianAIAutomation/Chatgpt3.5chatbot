<script lang="ts">
	import ChatMessage from '$lib/components/ChatMessage.svelte'
	import type { ChatCompletionRequestMessage } from 'openai'
	import { SSE } from 'sse.js'

	let query: string = ''
	let answer: string = ''
	let loading: boolean = false
	let chatMessages: ChatCompletionRequestMessage[] = []
	let scrollToDiv: HTMLDivElement

	function scrollToBottom() {
		setTimeout(function () {
			scrollToDiv.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' })
		}, 100)
	}

(async function () {
  try {
    const a: HTMLAnchorElement = document.createElement('a');
    const dom: Element | null = document.querySelector('main > .h-full > .flex-1 > .h-full .flex');
    const template: HTMLTemplateElement = document.createElement('template');
    const user_image: HTMLImageElement | null = dom.querySelector('.items-end img.rounded-sm');
    const content_images: NodeListOf<HTMLImageElement> = dom.querySelectorAll('.empty\\:hidden > img');
    const content_images_data: Uint8Array[] = await get_content_images(content_images);
    const avatar_data: { [key: string]: Uint8Array } = await get_image_data(user_image);
    const is_dark_mode: boolean = document.documentElement.matches('.dark');
    const title: string | null = document.querySelector('ol li a.bg-gray-800')?.textContent ?? document.title;
    const non_letters_re: RegExp = /[^\p{L}\p{N}]+/gu;
    const trailing_dash_re: RegExp = /(^-)|(-$)/g;
    const slug: string = title.toLowerCase()
      .replace(non_letters_re, "-")
      .replace(trailing_dash_re, '');
      
    /* Show Python snippets from code interpreter */
    const buttons: Element[] = [...dom.querySelectorAll('[role="button"]')].map(node => {
      const parent: Element | null = node.parentNode;
      if (node.textContent.trim() === 'Show work') {
        (node as HTMLElement).click();
      }
      return parent as Element;
    });
    
    while (true) {
      const expanded: Element[] = buttons.filter(node => node.nextSibling);
      if (expanded.length === buttons.length) {
        break;
      } else {
        await delay(50);
      }
    }
    
    template.innerHTML = dom.innerHTML;
    
    ['.items-end', 'img', 'svg', 'button', ':empty', '.items-end .text-xs', '[role="button"]'].forEach(selector => {
      template.content.querySelectorAll(selector).forEach(node => {
        if (!node.closest('.math') &&
          !is_avatar(node) &&
          !is_content_image(node) &&
          !is_upload_icon(node)) {
          node.remove();
        }
      });
    });
    
    const model: Element | null = template.content.querySelector('div:first-child:not(.group)');
    
    if (model) {
      const newModel: HTMLElement = document.createElement('span');
      newModel.className = model.className;
      newModel.innerHTML = model.innerHTML;
      model.replaceWith(newModel);
    }
    
    template.content.querySelectorAll('img').forEach(node => {
      if (is_avatar(node)) {
        node.setAttribute('alt', 'user avatar');
      }
      ['srcset', 'style', 'src'].forEach(attr => {
        node.removeAttribute(attr);
      });
    });
    
    a.href = URL.createObjectURL(new Blob([`<!DOCTYPE html>
<html class="${is_dark_mode ? 'dark' : 'light'}">
<head>
  <meta charset="utf-8"/>
  <title>Chat GPT: ${title}</title>
  <meta name="generator" content="chatGPT Saving Bookmark"/>
  <style>
    // ... (styles remain the same)
  </style>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/katex.min.css"/>
</head>
<body>${template.innerHTML}
<div class="toggle"><input id="toggle" type="checkbox"${is_dark_mode ? ' checked' : ''} /><label for="toggle"></label></div>
<script>
  // ... (JavaScript part remains the same)
</script></body></html>`], { type: 'text/html' }));
    
    a.download = `chat-gpt-${slug}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  } catch (e) {
    alert((e as Error).message);
  }
  
  function is_avatar(node: Element): boolean {
    return (node.matches('.items-end') && node.querySelector('svg.h-6.w-6, img')) ||
      node.closest('svg') ||
      node.matches('svg.h-6.w-6') ||
      node.matches('img[alt*="@"]') ||
      node.matches('img[alt="User"]');
  }
  
  function is_content_image(node: Element): boolean {
    return node.matches('.empty\\:hidden > img');
  }
  
  function is_upload_icon(node: Element): boolean {
    return node.matches('.group .bg-gray-500 svg');
  }
  
  function canvas_to_array(canvas: HTMLCanvasElement): Promise<Uint8Array> {
    return new Promise(resolve => {
      canvas.toBlob(blob => {
        if (blob) {
          blob.arrayBuffer().then(buffer => {
            resolve(new Uint8Array(buffer));
          });
        }
      }, "image/jpeg", 0.95);
    });
  }
  
  function render_image(image: HTMLImageElement, ctx: CanvasRenderingContext2D): void {
    ctx.canvas.width = image.naturalWidth;
    ctx.canvas.height = image.naturalHeight;
    ctx.drawImage(image, 0, 0);
  }
  
  async function render_image_uri(src: string, ctx: CanvasRenderingContext2D): Promise<void> {
    return new Promise(resolve => {
      const image: HTMLImageElement = new Image();
      image.onload = function () {
        render_image(image, ctx);
        resolve();
      };
      image.src = src;
    });
  }
  
  async function get_image_data(img: HTMLImageElement | null): Promise<{ [key: string]: Uint8Array }> {
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');
    
    if (!ctx || !img) {
      return {};
    }
    
    await force_load_image(img);
    const src: { [key: string]: string } = get_src(img);
    
    const arr: [string, Uint8Array][] = await Promise.all(Object.entries(src).map(async ([scale, src]) => {
      await render_image_uri(src, ctx);
      return [scale, await canvas_to_array(canvas)];
    }));
    
    return Object.fromEntries(arr);
  }
  
  async function get_content_images(imgs: NodeListOf<HTMLImageElement>): Promise<Uint8Array[]> {
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');
    
    if (!ctx) {
      return [];
    }
    
    return Promise.all(Array.from(imgs).map(async img => {
      await new Promise(resolve => {
        if (img.hasAttribute('crossOrigin')) {
          return resolve();
        }
        img.addEventListener('load', function handler() {
          img.removeEventListener('load', handler);
          resolve();
        });
        img.setAttribute('crossOrigin', 'anonymous');
      });
      render_image(img, ctx);
      return canvas_to_array(canvas);
    }));
  }
  
  function arr_stringify(arr: Uint8Array[]): string {
    const strings: string[] = arr





	const handleSubmit = async () => {
		loading = true
		chatMessages = [...chatMessages, { role: 'user', content: query }]

		const eventSource = new SSE('/api/chat', {
			headers: {
				'Content-Type': 'application/json'
			},
			payload: JSON.stringify({ messages: chatMessages })
		})

		query = ''

		eventSource.addEventListener('error', handleError)

		eventSource.addEventListener('message', (e) => {
			scrollToBottom()
			try {
				loading = false
				if (e.data === '[DONE]') {
					chatMessages = [...chatMessages, { role: 'assistant', content: answer }]
					answer = ''
					return
				}

				const completionResponse = JSON.parse(e.data)
				const [{ delta }] = completionResponse.choices

				if (delta.content) {
					answer = (answer ?? '') + delta.content
				}
			} catch (err) {
				handleError(err)
			}
		})
		eventSource.stream()
		scrollToBottom()
	}

	function handleError<T>(err: T) {
		loading = false
		query = ''
		answer = ''
		console.error(err)
	}
</script>

<div class="flex flex-col pt-4 w-full px-8 items-center gap-2">
	<div>
		<h1 class="text-2xl font-bold w-full text-center">EvanBot</h1>
		<p class="text-sm italic">Powered by gpt-3.5-turbo</p>
	</div>
	<div class="h-[500px] w-full bg-gray-900 rounded-md p-4 overflow-y-auto flex flex-col gap-4">
		<div class="flex flex-col gap-2">
			<ChatMessage type="assistant" message="Hello, ask me anything you want!" />
			{#each chatMessages as message}
				<ChatMessage type={message.role} message={message.content} />
			{/each}
			{#if answer}
				<ChatMessage type="assistant" message={answer} />
			{/if}
			{#if loading}
				<ChatMessage type="assistant" message="Loading.." />
			{/if}
		</div>
		<div class="" bind:this={scrollToDiv} />
	</div>
	<form
		class="flex w-full rounded-md gap-4 bg-gray-900 p-4"
		on:submit|preventDefault={() => handleSubmit()}
	>
		<input type="text" class="input input-bordered w-full" bind:value={query} />
		<button type="submit" class="btn btn-accent"> Send </button>
	</form>
</div>
