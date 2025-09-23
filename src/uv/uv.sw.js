(()=>{var h=self.Ultraviolet,C=["cross-origin-embedder-policy","cross-origin-opener-policy","cross-origin-resource-policy","content-security-policy","content-security-policy-report-only","expect-ct","feature-policy","origin-isolation","strict-transport-security","upgrade-insecure-requests","x-content-type-options","x-download-options","x-frame-options","x-permitted-cross-domain-policies","x-powered-by","x-xss-protection"],E=["GET","HEAD"],g=class extends h.EventEmitter{constructor(e=__uv$config){super(),e.prefix||(e.prefix="/service/"),this.config=e,this.bareClient=new h.BareClient}route({request:e}){return!!e.url.startsWith(location.origin+this.config.prefix)}async fetch({request:e}){let s;try{if(!e.url.startsWith(location.origin+this.config.prefix))return await fetch(e);let t=new h(this.config);typeof this.config.construct=="function"&&this.config.construct(t,"service");let v=await t.cookie.db();t.meta.origin=location.origin,t.meta.base=t.meta.url=new URL(t.sourceUrl(e.url));let o=new w(e,t,E.includes(e.method.toUpperCase())?null:await e.blob());if(t.meta.url.protocol==="blob:"&&(o.blob=!0,o.base=o.url=new URL(o.url.pathname)),e.referrer&&e.referrer.startsWith(location.origin)){let i=new URL(t.sourceUrl(e.referrer));(o.headers.origin||t.meta.url.origin!==i.origin&&e.mode==="cors")&&(o.headers.origin=i.origin),o.headers.referer=i.href}let f=await t.cookie.getCookies(v)||[],x=t.cookie.serialize(f,t.meta,!1);o.headers["user-agent"]=navigator.userAgent,x&&(o.headers.cookie=x);let p=new u(o,null,null);if(this.emit("request",p),p.intercepted)return p.returnValue;s=o.blob?"blob:"+location.origin+o.url.pathname:o.url;let c=await this.bareClient.fetch(s,{headers:o.headers,method:o.method,body:o.body,credentials:o.credentials,mode:o.mode,cache:o.cache,redirect:o.redirect}),r=new y(o,c),l=new u(r,null,null);if(this.emit("beforemod",l),l.intercepted)return l.returnValue;for(let i of C)r.headers[i]&&delete r.headers[i];if(r.headers.location&&(r.headers.location=t.rewriteUrl(r.headers.location)),["document","iframe"].includes(e.destination)){let i=r.getHeader("content-disposition");if(!/\s*?((inline|attachment);\s*?)filename=/i.test(i)){let n=/^\s*?attachment/i.test(i)?"attachment":"inline",[m]=new URL(c.finalURL).pathname.split("/").slice(-1);r.headers["content-disposition"]=`${n}; filename=${JSON.stringify(m)}`}}if(r.headers["set-cookie"]&&(Promise.resolve(t.cookie.setCookies(r.headers["set-cookie"],v,t.meta)).then(()=>{self.clients.matchAll().then(function(i){i.forEach(function(n){n.postMessage({msg:"updateCookies",url:t.meta.url.href})})})}),delete r.headers["set-cookie"]),r.body)switch(e.destination){case"script":r.body=t.js.rewrite(await c.text());break;case"worker":{let i=[t.bundleScript,t.clientScript,t.configScript,t.handlerScript].map(n=>JSON.stringify(n)).join(",");r.body=`if (!self.__uv) {
                                ${t.createJsInject(t.cookie.serialize(f,t.meta,!0),e.referrer)}
                            importScripts(${i});
                            }
`,r.body+=t.js.rewrite(await c.text())}break;case"style":r.body=t.rewriteCSS(await c.text());break;case"iframe":case"document":if(r.getHeader("content-type")&&r.getHeader("content-type").startsWith("text/html")){let i=await c.text();if(Array.isArray(this.config.inject)){let n=i.indexOf("<head>"),m=i.indexOf("<HEAD>"),b=i.indexOf("<body>"),k=i.indexOf("<BODY>"),S=new URL(s),U=this.config.inject;for(let d of U)new RegExp(d.host).test(S.host)&&(d.injectTo==="head"?(n!==-1||m!==-1)&&(i=i.slice(0,n)+`${d.html}`+i.slice(n)):d.injectTo==="body"&&(b!==-1||k!==-1)&&(i=i.slice(0,b)+`${d.html}`+i.slice(b)))}r.body=t.rewriteHtml(i,{document:!0,injectHead:t.createHtmlInject(t.handlerScript,t.bundleScript,t.clientScript,t.configScript,t.cookie.serialize(f,t.meta,!0),e.referrer)})}break;default:break}return o.headers.accept==="text/event-stream"&&(r.headers["content-type"]="text/event-stream"),crossOriginIsolated&&(r.headers["Cross-Origin-Embedder-Policy"]="require-corp"),this.emit("response",l),l.intercepted?l.returnValue:new Response(r.body,{headers:r.headers,status:r.status,statusText:r.statusText})}catch(t){return["document","iframe"].includes(e.destination)?(console.error(t),R(t,s)):new Response(void 0,{status:500})}}static Ultraviolet=h};self.UVServiceWorker=g;var y=class{constructor(e,s){this.request=e,this.raw=s,this.ultraviolet=e.ultraviolet,this.headers={};for(let t in s.rawHeaders)this.headers[t.toLowerCase()]=s.rawHeaders[t];this.status=s.status,this.statusText=s.statusText,this.body=s.body}get url(){return this.request.url}get base(){return this.request.base}set base(e){this.request.base=e}getHeader(e){return Array.isArray(this.headers[e])?this.headers[e][0]:this.headers[e]}},w=class{constructor(e,s,t=null){this.ultraviolet=s,this.request=e,this.headers=Object.fromEntries(e.headers.entries()),this.method=e.method,this.body=t||null,this.cache=e.cache,this.redirect=e.redirect,this.credentials="omit",this.mode=e.mode==="cors"?e.mode:"same-origin",this.blob=!1}get url(){return this.ultraviolet.meta.url}set url(e){this.ultraviolet.meta.url=e}get base(){return this.ultraviolet.meta.base}set base(e){this.ultraviolet.meta.base=e}},u=class{#e;#t;constructor(e={},s=null,t=null){this.#e=!1,this.#t=null,this.data=e,this.target=s,this.that=t}get intercepted(){return this.#e}get returnValue(){return this.#t}respondWith(e){this.#t=e,this.#e=!0}};function O(a,e){let s=`
        errorTrace.value = ${JSON.stringify(a)};
        fetchedURL.textContent = ${JSON.stringify(e)};
        for (const node of document.querySelectorAll("#uvHostname")) node.textContent = ${JSON.stringify(location.hostname)};
        reload.addEventListener("click", () => location.reload());
        uvVersion.textContent = ${JSON.stringify("3.2.7")};
    `;return`
<!doctype html>
<html lang="en">
	<head>
		<link rel="stylesheet" href="/css/index.css" />
		<link rel="stylesheet" href="/css/themes.css" />
		<script src="index.js"></script>
		<link
			rel="stylesheet"
			href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined"
		/>
		<script src="https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js"></script>
		<title>Space</title>
		<link rel="icon" type="icon/x-icon" href="/assets/favicon.ico" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<meta
			name="description"
			content="Launch into Space, the next gen proxy."
		/>
		<meta
			name="keywords"
			content="Proxy, Unblocker, Space Unblocker, Space"
		/>
		<meta property="og:image" content="/assets/logo.webp" />
		<script
			async
			src="https://www.googletagmanager.com/gtag/js?id=G-3DTW1KTNCF"
		></script>
		<script>
			window.dataLayer = window.dataLayer || [];
			function gtag() {
				dataLayer.push(arguments);
			}
			gtag('js', new Date());

			gtag('config', 'G-3DTW1KTNCF');
		</script>
		<script>
			if (window.location.pathname.includes('/space/')) {
				window.location.href = 'about:blank';
			}
		</script>
		<link
			rel="preload"
			as="style"
			href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css"
		/>
		<link
			rel="preload"
			as="style"
			href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap"
		/>
		<link rel="stylesheet" href="/css/index.css" />
		<link
			rel="stylesheet"
			href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..400,0..1"
		/>
		<script src="https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js"></script>
	</head>

	<body style="overflow: hidden">
		<div class="failtoast">
			<div class="failtoast-content">
				<i class="fa fa-solid fa-circle-exclamation fail"></i>
				<div class="failmessage">
					<span class="failtext text-1" id="text-1">Failed</span>
					<span class="failtext text-2" id="text-2"
						>Something went wrong. Please try again.</span
					>
				</div>
			</div>
			<i class="fa-solid fa-xmark failclose"></i>
			<div class="failprogress"></div>
		</div>
		<ul class="navbar">
			<li style="margin-left: -1px; margin-top: 2px">
				<a href="/"
					><img class="logo" src="/assets/logo.webp" alt="Logo"
				/></a>
			</li>
			<hr style="margin-top: 5px" />
			<li>
				<a href="/"
					><span
						style="margin-top: 0px"
						class="material-symbols-outlined"
						>cottage</span
					></a
				>
			</li>
			<li>
				<a href="/g"
					><span class="material-symbols-outlined">joystick</span></a
				>
			</li>
			<li>
				<a href="/a"
					><span class="material-symbols-outlined">apps</span></a
				>
			</li>
			<li>
				<a href="/&"
					><span class="material-symbols-outlined">public</span></a
				>
			</li>

			<hr />
			<li>
				<span style="margin-top: 0" class="material-symbols-outlined"
					>tune</span
				>
			</li>
			<li>
				<a target="_blank" href="https://discord.gointospace.app">
					<div
						style="
							height: 40px !important;
							width: 40px !important;
							margin-top: 10px;
							margin-bottom: -6px;
						"
					>
						<i
							class="fa-brands fa-discord"
							style="transform: translateY(-6px)"
						></i>
					</div>
				</a>
			</li>
		</ul>
		<div class="header" style="width: 100%; text-align: center">
			<img style="width: 400px" src="/assets/404.png" />
			<h1 style="margin-bottom: 6px">Lost in Space</h1>
			<p>Looks like you've reached the end of the universe</p>
		</div>
		<div class="box_astronaut">
			<img
				class="object_astronaut"
				src="http://salehriaz.com/404Page/img/astronaut.svg"
				width="140px"
			/>
		</div>
		<div class="blob"></div>
		<div class="blobsmall"></div>
		<div class="blobtop"></div>
		<div style="z-index: -999" id="particles-js"></div>
		<script>
			particlesJS('particles-js', {
				particles: {
					number: {
						value: 86,
						density: {
							enable: true,
							value_area: 800
						}
					},
					color: {
						value: '#ffffff'
					},
					shape: {
						type: 'circle',
						stroke: {
							width: 0,
							color: '#000000'
						},
						polygon: {
							nb_sides: 5
						},
						image: {
							src: 'img/github.svg',
							width: 100,
							height: 100
						}
					},
					opacity: {
						value: 1,
						random: true,
						anim: {
							enable: false,
							speed: 1,
							opacity_min: 0.1,
							sync: false
						}
					},
					size: {
						value: 2,
						random: true,
						anim: {
							enable: false,
							speed: 40,
							size_min: 0.1,
							sync: false
						}
					},
					line_linked: {
						enable: false,
						distance: 150,
						color: '#ffffff',
						opacity: 0.4,
						width: 1
					},
					move: {
						enable: true,
						speed: 0.5,
						direction: 'top',
						random: false,
						straight: false,
						out_mode: 'out',
						bounce: false,
						attract: {
							enable: false,
							rotateX: 318.0130544358847,
							rotateY: 556.5228452627983
						}
					}
				},
				interactivity: {
					detect_on: 'window',
					events: {
						onhover: {
							enable: false,
							mode: 'repulse'
						},
						onclick: {
							enable: true,
							mode: 'push'
						},
						resize: true
					},
					modes: {
						grab: {
							distance: 400,
							line_linked: {
								opacity: 1
							}
						},
						bubble: {
							distance: 400,
							size: 40,
							duration: 2,
							opacity: 8,
							speed: 3
						},
						repulse: {
							distance: 200,
							duration: 0.4
						},
						push: {
							particles_nb: 10
						},
						remove: {
							particles_nb: 10
						}
					}
				},
				retina_detect: true
			});
		</script>
		<script src="/js/localforage.min.js"></script>
		<script src="/js/c.js"></script>
		<script src="/js/themes.js"></script>
		<script>
			let CLF_config = {
				app_id: '163a312a-7cde-41ab-a80c-cb4cf281efdf',
				data: {
					user_id: '123456', // required
					user_email: 'user@email.com', // required
					user_name: 'User Name', // optional
					custom_data: {
						JobRole: 'CEO', // optional
						Plan: 'Pro', // optional
						teamMates: '4', // optional
						MonthlySpend: '50 USD' // optional
					}
				}
			};
		</script>
		<script async src="https://widget.changelogfy.com/index.js"></script>
	</body>
</html>

    `}function R(a,e){let s={"content-type":"text/html"};return crossOriginIsolated&&(s["Cross-Origin-Embedder-Policy"]="require-corp"),new Response(O(String(a),e),{status:500,headers:s})}})();
//# sourceMappingURL=uv.sw.js.map
