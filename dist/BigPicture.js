var BigPicture = (function () {
	// BigPicture.js | license MIT | henrygd.me/bigpicture

	// trigger element used to open popup
	var el;

	// set to true after first interaction
	var initialized;

	// container element holding html needed for script
	var container;

	// currently active display element (image, video, youtube / vimeo iframe container)
	var displayElement;

	// popup image element
	var displayImage;

	// popup video element
	var displayVideo;

	// popup audio element
	var displayAudio;

	// container element to hold youtube / vimeo iframe
	var iframeContainer;

	// iframe to hold youtube / vimeo player
	var iframeSiteVid;

	// store requested image source
	var imgSrc;

	// youtube / vimeo video id
	var siteVidID;

	// keeps track of loading icon display state
	var isLoading;

	// timeout to check video status while loading
	var checkMediaTimeout;

	// loading icon element
	var loadingIcon;

	// caption element
	var caption;

	// store caption border
	var captionBorder;

	// caption content element
	var captionText;

	// store caption content
	var captionContent;

	// open state for container element
	var isOpen;

	// gallery open state
	var galleryOpen;

	// used during close animation to avoid triggering timeout twice
	var isClosing;

	// array of prev viewed image urls to check if cached before showing loading icon
	var imgCache = [];

	// store whether image requested is remote or local
	var remoteImage;

	// store animation opening callbacks
	var animationStart;
	var animationEnd;

	// store changeGalleryImage callback
	var onChangeImage;

	// gallery left / right icons
	var rightArrowBtn;

	var leftArrowBtn;

	// position of gallery
	var galleryPosition;

	// hold active gallery els / image src
	var galleryEls;

	// store images in gallery that are being loaded
	var preloadedImages = {};

	// whether device supports touch events
	var supportsTouch;

	// options object
	var opts;

	// Save bytes in the minified version
	var appendEl = 'appendChild';
	var createEl = 'createElement';
	var removeEl = 'removeChild';

	function BigPicture (options) {
		// initialize called on initial open to create elements / style / event handlers
		initialized || initialize();

		// clear currently loading stuff
		if (isLoading) {
			clearTimeout(checkMediaTimeout);
			removeContainer();
		}

		opts = options;

		// store video id if youtube / vimeo video is requested
		siteVidID = options.ytSrc || options.vimeoSrc;

		// store optional callbacks
		animationStart = options.animationStart;
		animationEnd = options.animationEnd;
		onChangeImage = options.onChangeImage;

		// set trigger element
		el = options.el;

		// wipe existing remoteImage state
		remoteImage = false;

		// set caption if provided
		captionContent = el.getAttribute('data-caption');

		if (options.gallery) {
			makeGallery(options.gallery, options.position);
		} else if (siteVidID || options.iframeSrc) {
			// if vimeo, youtube, or iframe video
			// toggleLoadingIcon(true)
			displayElement = iframeContainer;
			createIframe();
		} else if (options.imgSrc) {
			// if remote image
			remoteImage = true;
			imgSrc = options.imgSrc;
			!~imgCache.indexOf(imgSrc) && toggleLoadingIcon(true);
			displayElement = displayImage;
			displayElement.src = imgSrc;
		} else if (options.audio) {
			// if direct video link
			toggleLoadingIcon(true);
			displayElement = displayAudio;
			displayElement.src = options.audio;
			checkMedia('audio file');
		} else if (options.vidSrc) {
			// if direct video link
			toggleLoadingIcon(true);
			if (options.dimensions) {
				changeCSS(displayVideo, ("width:" + (options.dimensions[0]) + "px"));
			}
			makeVidSrc(options.vidSrc);
			checkMedia('video');
		} else {
			// local image / background image already loaded on page
			displayElement = displayImage;
			// get img source or element background image
			displayElement.src =
				el.tagName === 'IMG'
					? el.src
					: window
							.getComputedStyle(el)
							.backgroundImage.replace(/^url|[(|)|'|"]/g, '');
		}

		// add container to page
		container[appendEl](displayElement);
		document.body[appendEl](container);
		return {
			close: close,
			next: function () { return updateGallery(1); },
			prev: function () { return updateGallery(-1); },
		}
	}

	// create all needed methods / store dom elements on first use
	function initialize() {
		var startX;

		function createArrowSymbol(nextImage, direction) {
			var el = document[createEl]('button');
			var padding = direction === 'left'
				? 'pr-20 py-24 lg:py-0'
				: 'pl-20 py-24 lg:py-0';
			el.className = 'bp-arrow ' + padding + ' ' + direction + '-0';

			var arrow = document[createEl]('DIV');
			var rounded = direction === 'left'
				? 'rounded-r-lg'
				: 'rounded-l-lg';

			arrow.className = rounded + ' px-6 py-4 bg-red-light hover:bg-red-medium transition-all';
			arrow.innerHTML = direction === 'left'
				? '<svg class="w-auto h-12 text-white fill-current" viewBox="0 0 37 32"><path d="M34.904 15.396a30.8 30.8 0 00.275-2.893c.092-1.652-2.203-2.111-2.984-.826-.046.092-.092.138-.138.23-.275-.551-.826-.873-1.423-.919.092-.32.184-.688.322-1.01.505-1.606-1.837-2.754-2.755-1.514-.184-.184-.46-.322-.689-.414.092-.275.184-.505.276-.78.55-1.561-1.286-2.387-2.433-1.699l.137-.55c.368-1.7-2.112-2.939-2.938-1.24-.459.918-.872 1.79-1.331 2.708.137-1.01-.689-1.652-1.515-1.698.275-.964.55-1.883.826-2.8.55-1.791-2.02-2.755-2.938-1.24a49.63 49.63 0 00-2.617 4.866c-.046-1.148-1.331-1.79-2.25-1.423-.046-.46-.091-.964-.183-1.423-.276-1.378-2.296-1.515-2.938-.368a191.834 191.834 0 00-2.801 5.28c.092-.413.138-.826.23-1.285.32-1.653-1.424-2.571-2.663-1.561C2.813 6.077 1.527 7.499.38 9.107c-1.102 1.56 1.24 3.075 2.525 1.882-.551 2.846-1.056 5.692-1.607 8.493-.322 1.653 2.158 3.03 2.938 1.24.092-.184.138-.322.23-.506.459.505 1.147.78 1.698.551-.367 1.607-.734 3.214-1.147 4.867-.414 1.836 1.928 2.754 2.938 1.24.505-.735.964-1.47 1.423-2.204.413.275 1.056.367 1.607.23-.413 1.698-.78 3.35-1.194 5.05-.367 1.698 2.112 2.937 2.938 1.239.643-1.286 1.286-2.617 1.929-3.903.137 1.01 1.24 1.515 2.157 1.24-.091 1.79 2.48 2.387 3.122.55.643-1.835 1.332-3.672 1.974-5.508-.367 1.01-.734 2.02-1.102 3.076-.688 1.974 2.434 2.8 3.122.872.322-.872.643-1.745.964-2.663 0 .551.046 1.102.092 1.653.138 1.745 2.663 2.25 3.168.413.643-2.433 1.653-4.637 2.8-6.749-.367 2.158-.734 4.362-.826 6.566-.092 1.882 2.617 2.111 3.168.413.505-1.653 1.056-3.306 1.56-5.004.46-1.515.781-3.168 1.745-4.408.919-1.285-.413-2.525-1.698-2.341zm-4.316 1.423a1.81 1.81 0 00-.23.643c0 .413-.229.597-.642.643h-.138c-.23-.23-.55-.138-.826-.138-.643.046-1.286 0-1.882.046-.505.046-1.056 0-1.561.138-.23.046-.46.046-.689.046-1.01 0-1.974.183-2.984.092-1.01-.093-1.974 0-2.984 0 0 .045-.046.091-.046.091l.183.184c.276.23.505.46.597.826.092.368.276.735.368 1.148.045.184 0 .413 0 .597 0 .46-.184 1.01-.276 1.47-.046.229-.092.458-.23.642-.137.184-.413.321-.596.23a1.01 1.01 0 01-.23-.138c-.183-.092-.367-.092-.55-.138-.322-.092-.552-.275-.827-.46-.597-.458-1.331-.734-2.02-1.1-.413-.23-.78-.552-1.194-.827-.321-.23-.688-.413-1.056-.597-.413-.23-.872-.413-1.285-.643-.092-.046-.138-.138-.23-.23l-.321-.32c-.138-.368-.184-.827-.413-1.194-.092-.092-.092-.276-.138-.414-.092-.413-.138-.872-.23-1.285 0-.092 0-.184.046-.276.046-.23.092-.459-.091-.642.045-.184.091-.322.091-.46 0-.183.092-.367.276-.458l.275-.138c.643-.23.918-.872 1.378-1.286.459-.413.826-.872 1.423-1.056.092 0 .137-.092.23-.137.183-.092.32-.184.504-.322.092-.046.23-.092.276-.183.321-.368.734-.505 1.193-.643.23-.092.46-.275.69-.413.55-.322 1.01-.689 1.652-.827.046 0 .092-.046.138-.092.32-.183.55-.092.734.23.276.459.23 1.01.367 1.469.046.184.046.367.276.46.413.275.55.78.413 1.285-.184.596-.55 1.056-1.01 1.469l-.413.413c.688 0 1.331.046 1.928-.138.138-.046.321-.092.505-.092.413 0 .826-.046 1.194-.184.046 0 .092 0 .137-.045.368-.368.919-.414 1.378-.597.137-.046.23-.138.321-.184.551-.046 1.056-.092 1.607-.184.092 0 .184-.137.321-.137.23-.046.413-.184.643 0 .046.046.138 0 .184 0 .137 0 .321-.046.459-.046.642 0 1.24.137 1.882.23h.046c.413.412 1.102.55 1.194 1.285.046.321.23.642.321.964.046.137.046.275.046.413 0 .092-.046.184 0 .23.092.32-.092.55-.184.78z"/></svg>'
				: '<svg class="w-auto h-12 text-white fill-current" viewBox="0 0 37 32"><path d="M2.096 16.604a30.8-30.8 0 00-.275 2.893c-.092 1.652 2.203 2.111 2.984.826.046-.092.092-.138.138-.23.275.551.826.873 1.423.92-.092.32-.184.687-.322 1.01-.505 1.605 1.837 2.753 2.755 1.513.184.184.46.322.69.414-.093.275-.185.505-.277.78-.55 1.561 1.286 2.387 2.433 1.7l-.137.55c-.368 1.7 2.112 2.938 2.938 1.24.46-.919.872-1.79 1.331-2.709-.137 1.01.69 1.652 1.515 1.698-.275.964-.55 1.883-.826 2.8-.55 1.791 2.02 2.755 2.938 1.24a49.63-49.63 0 002.617-4.866c.046 1.148 1.331 1.79 2.25 1.423.046.46.091.964.183 1.423.276 1.378 2.296 1.515 2.938.368a191.834-191.834 0 002.801-5.28c-.092.413-.138.826-.23 1.285-.32 1.653 1.424 2.571 2.663 1.561 1.561-1.24 2.847-2.662 3.994-4.27 1.102-1.56-1.24-3.075-2.525-1.882.551-2.846 1.056-5.692 1.607-8.493.322-1.653-2.158-3.03-2.938-1.24-.092.184-.138.322-.23.506-.459-.505-1.147-.78-1.698-.55.367-1.608.734-3.215 1.147-4.868.414-1.836-1.928-2.754-2.938-1.24-.505.735-.964 1.47-1.423 2.204-.413-.275-1.056-.367-1.607-.23.413-1.698.78-3.35 1.194-5.05.367-1.698-2.112-2.937-2.938-1.239-.643 1.286-1.286 2.617-1.929 3.903-.137-1.01-1.24-1.515-2.157-1.24.091-1.79-2.48-2.387-3.122-.55-.643 1.835-1.332 3.672-1.974 5.508.367-1.01.734-2.02 1.102-3.076.688-1.974-2.434-2.8-3.122-.872-.322.872-.643 1.745-.964 2.663a19.9 19.9 0 00-.092-1.653c-.138-1.745-2.663-2.25-3.168-.413-.643 2.433-1.653 4.637-2.8 6.75.367-2.159.734-4.363.826-6.567.092-1.882-2.617-2.11-3.168-.413-.505 1.653-1.056 3.306-1.56 5.004-.46 1.515-.78 3.168-1.745 4.408-.919 1.285.413 2.525 1.698 2.341zm4.316-1.423a1.81-1.81 0 00.23-.643c0-.413.23-.597.642-.643h.138c.23.23.55.138.826.138.643-.046 1.286 0 1.882-.046.505-.046 1.056 0 1.561-.138.23-.046.46-.046.69-.046 1.01 0 1.973-.183 2.983-.092 1.01.093 1.974 0 2.984 0 0-.045.046-.09.046-.09l-.183-.185c-.276-.23-.505-.46-.597-.826-.092-.368-.276-.735-.368-1.148-.045-.184 0-.413 0-.597 0-.46.184-1.01.276-1.47.046-.229.092-.458.23-.642.137-.184.413-.32.596-.23a1.01-1.01 0 01.23.138c.183.092.367.092.55.138.322.092.552.275.827.46.597.458 1.331.734 2.02 1.1.413.23.78.552 1.194.827.321.23.688.413 1.056.597.413.23.872.413 1.285.643.092.046.138.138.23.23l.321.32c.138.368.184.827.413 1.194.092.092.092.276.138.414.092.413.138.872.23 1.285 0 .092 0 .184-.046.276-.046.23-.092.46.091.642-.045.184-.09.322-.09.46a.503.503 0 01-.277.458l-.275.138c-.643.23-.918.872-1.378 1.286-.459.413-.826.872-1.423 1.056-.092 0-.137.092-.23.137-.183.092-.32.184-.504.322-.092.046-.23.092-.276.183-.32.368-.734.505-1.193.643-.23.092-.46.275-.69.413-.55.322-1.01.69-1.652.827-.046 0-.092.046-.138.092-.32.183-.55.092-.734-.23-.276-.459-.23-1.01-.367-1.469-.046-.184-.046-.367-.276-.46-.413-.275-.55-.78-.413-1.285.184-.596.55-1.056 1.01-1.469l.413-.413c-.688 0-1.33-.046-1.928.138a1.647 1.647 0 01-.505.092c-.413 0-.826.046-1.194.184-.046 0-.092 0-.137.045-.368.368-.919.414-1.378.597-.137.046-.23.138-.32.184-.552.046-1.057.092-1.608.184-.092 0-.184.137-.32.137-.23.046-.414.184-.644 0-.046-.046-.138 0-.184 0-.137 0-.32.046-.459.046-.642 0-1.24-.137-1.882-.23H7.79c-.413-.412-1.102-.55-1.194-1.285-.046-.32-.23-.642-.32-.964-.047-.137-.047-.275-.047-.413 0-.092.046-.184 0-.23-.092-.32.092-.55.184-.78z" /></svg>';
			el[appendEl](arrow);

			// changeCSS(el, style)
			el.onclick = function (e) {
				e.stopPropagation();
				updateGallery(nextImage);
			};
			return el
		}

		// create container element
		container = document[createEl]('DIV');
		container.className = 'bp-container';
		container.onclick = close;
		// gallery swipe listeners
		if ('ontouchstart' in window) {
			supportsTouch = true;
			container.ontouchstart = function (ref) {
				var changedTouches = ref.changedTouches;

				startX = changedTouches[0].pageX;
			};
			container.ontouchmove = function (e) {
				e.preventDefault();
			};
			container.ontouchend = function (ref) {
				var changedTouches = ref.changedTouches;

				if (!galleryOpen) {
					return
				}
				var distX = changedTouches[0].pageX - startX;
				// swipe right
				distX < -30 && updateGallery(1);
				// swipe left
				distX > 30 && updateGallery(-1);
			};
		}

		// create display image element
		displayImage = document[createEl]('IMG');

		// create display video element
		displayVideo = document[createEl]('VIDEO');
		displayVideo.className = 'bp-vid';
		displayVideo.setAttribute('playsinline', true);
		displayVideo.controls = true;
		displayVideo.loop = true;

		// create audio element
		displayAudio = document[createEl]('audio');
		displayAudio.className = 'bp-aud';
		displayAudio.controls = true;
		displayAudio.loop = true;

		// create caption elements
		caption = document[createEl]('DIV');
		caption.className = 'bp-caption';
		captionText = document[createEl]('SPAN');
		// FV
		captionBorder = document[createEl]('DIV');
		captionBorder.classList.add('zigzag-border', 'w-full', 'left-0', 'right-0', 'absolute', 'z-10');
		caption[appendEl](captionBorder);
		// FV END
		caption[appendEl](captionText);
		container[appendEl](caption);

		// left / right arrow icons
		leftArrowBtn = createArrowSymbol(-1, 'left');
		rightArrowBtn = createArrowSymbol(1, 'right');

		// create loading icon element
		loadingIcon = document[createEl]('DIV');
		loadingIcon.className = 'bp-loader';
		loadingIcon.innerHTML =
			'<svg viewbox="0 0 32 32" fill="#fff" opacity=".8"><path d="M16 0a16 16 0 0 0 0 32 16 16 0 0 0 0-32m0 4a12 12 0 0 1 0 24 12 12 0 0 1 0-24" fill="#000" opacity=".5"/><path d="M16 0a16 16 0 0 1 16 16h-4A12 12 0 0 0 16 4z"/></svg>';
		// create youtube / vimeo container
		iframeContainer = document[createEl]('DIV');
		iframeContainer.className = 'bp-sv';

		// create iframe to hold youtube / vimeo player
		iframeSiteVid = document[createEl]('IFRAME');
		iframeSiteVid.setAttribute('allowfullscreen', true);
		iframeSiteVid.allow = 'autoplay; fullscreen';
		iframeSiteVid.onload = function () { return iframeContainer[removeEl](loadingIcon); };
		changeCSS(
			iframeSiteVid,
			'border:0;position:absolute;height:100%;width:100%;left:0;top:0'
		);
		iframeContainer[appendEl](iframeSiteVid);

		// display image bindings for image load and error
		displayImage.onload = open;
		displayImage.onerror = open.bind(null, 'image');

		window.addEventListener('resize', function () {
			// adjust loader position on window resize
			galleryOpen || (isLoading && toggleLoadingIcon(true));
			// adjust iframe dimensions
			displayElement === iframeContainer && updateIframeDimensions();
		});

		// close container on escape key press and arrow buttons for gallery
		document.addEventListener('keyup', function (ref) {
			var keyCode = ref.keyCode;

			keyCode === 27 && isOpen && close();
			if (galleryOpen) {
				keyCode === 39 && updateGallery(1);
				keyCode === 37 && updateGallery(-1);
				keyCode === 38 && updateGallery(10);
				keyCode === 40 && updateGallery(-10);
			}
		});
		// prevent scrolling with arrow keys if gallery open
		document.addEventListener('keydown', function (e) {
			var usedKeys = [37, 38, 39, 40];
			if (galleryOpen && ~usedKeys.indexOf(e.keyCode)) {
				e.preventDefault();
			}
		});

		// trap focus within conainer while open
		document.addEventListener(
			'focus',
			function (e) {
				if (isOpen && !container.contains(e.target)) {
					e.stopPropagation();
				}
			},
			true
		);

		// all done
		initialized = true;
	}

	// return transform style to make full size display el match trigger el size
	function getRect() {
		var ref = el.getBoundingClientRect();
		var top = ref.top;
		var left = ref.left;
		var width = ref.width;
		var height = ref.height;
		var leftOffset = left - (container.clientWidth - width) / 2;
		var centerTop = top - (container.clientHeight - height) / 2;
		var scaleWidth = el.clientWidth / displayElement.clientWidth;
		var scaleHeight = el.clientHeight / displayElement.clientHeight;
		return ("transform:translate3D(" + leftOffset + "px, " + centerTop + "px, 0) scale3D(" + scaleWidth + ", " + scaleHeight + ", 0)")
	}

	function makeVidSrc(source) {
		if (Array.isArray(source)) {
			displayElement = displayVideo.cloneNode();
			source.forEach(function (src) {
				var source = document[createEl]('SOURCE');
				source.src = src;
				source.type = "video/" + (src.match(/.(\w+)$/)[1]);
				displayElement[appendEl](source);
			});
		} else {
			displayElement = displayVideo;
			displayElement.src = source;
		}
	}

	function makeGallery(gallery, position) {
		var galleryAttribute = opts.galleryAttribute || 'data-bp';
		if (Array.isArray(gallery)) {
			// is array of images
			galleryPosition = position || 0;
			galleryEls = gallery;
			captionContent = gallery[galleryPosition].caption;
		} else {
			// is element selector or nodelist
			galleryEls = [].slice.call(
				typeof gallery === 'string'
					? document.querySelectorAll((gallery + " [" + galleryAttribute + "]"))
					: gallery
			);
			// find initial gallery position
			var elIndex = galleryEls.indexOf(el);
			galleryPosition =
				position === 0 || position ? position : elIndex !== -1 ? elIndex : 0;
			// make gallery object w/ els / src / caption
			galleryEls = galleryEls.map(function (el) { return ({
				el: el,
				src: el.getAttribute(galleryAttribute),
				caption: el.getAttribute('data-caption'),
			}); });
		}
		// show loading icon if needed
		remoteImage = true;
		// set initial src to imgSrc so it will be cached in open func
		imgSrc = galleryEls[galleryPosition].src;
		!~imgCache.indexOf(imgSrc) && toggleLoadingIcon(true);
		if (galleryEls.length > 1) {
			// if length is greater than one, add gallery stuff
			if (!supportsTouch) {
				// add arrows if device doesn't support touch
				container[appendEl](rightArrowBtn);
				container[appendEl](leftArrowBtn);
			}
		} else {
			// gallery is one, just show without clutter
			galleryEls = false;
		}
		displayElement = displayImage;
		// set initial image src
		displayElement.src = imgSrc;
	}

	function updateGallery(movement) {
		var galleryLength = galleryEls.length - 1;

		// only allow one change at a time
		if (isLoading) {
			return
		}

		// return if requesting out of range image
		var isEnd =
			(movement > 0 && galleryPosition === galleryLength) ||
			(movement < 0 && !galleryPosition);
		if (isEnd) {
			// if beginning or end of gallery, run end animation
			if (!opts.loop) {
				changeCSS(displayImage, '');
				setTimeout(
					changeCSS,
					9,
					displayImage,
					("animation:" + (movement > 0 ? 'bpl' : 'bpf') + " .3s;transition:transform .35s")
				);
				return
			}
			// if gallery is looped, adjust position to beginning / end
			galleryPosition = movement > 0 ? -1 : galleryLength + 1;
		}

		// normalize position
		galleryPosition = Math.max(0, Math.min(galleryPosition + movement, galleryLength))

		// load images before and after for quicker scrolling through pictures
		;[galleryPosition - 1, galleryPosition, galleryPosition + 1].forEach(
			function (position) {
				// normalize position
				position = Math.max(0, Math.min(position, galleryLength));
				// cancel if image has already been preloaded
				if (preloadedImages[position]) { return }
				var src = galleryEls[position].src;
				// create image for preloadedImages
				var img = document[createEl]('IMG');
				img.addEventListener('load', addToImgCache.bind(null, src));
				img.src = src;
				preloadedImages[position] = img;
			}
		);
		// if image is loaded, show it
		if (preloadedImages[galleryPosition].complete) {
			return changeGalleryImage(movement)
		}
		// if not, show loading icon and change when loaded
		isLoading = true;
		changeCSS(loadingIcon, 'opacity:.4;');
		container[appendEl](loadingIcon);
		preloadedImages[galleryPosition].onload = function () {
			galleryOpen && changeGalleryImage(movement);
		};
		// if error, store error object in el array
		preloadedImages[galleryPosition].onerror = function () {
			galleryEls[galleryPosition] = {
				error: 'Error loading image',
			};
			galleryOpen && changeGalleryImage(movement);
		};
	}

	function changeGalleryImage(movement) {
		if (isLoading) {
			container[removeEl](loadingIcon);
			isLoading = false;
		}
		var activeEl = galleryEls[galleryPosition];
		if (activeEl.error) {
			// show alert if error
			alert(activeEl.error);
		} else {
			// add new image, animate images in and out w/ css animation
			var oldimg = container.querySelector('img:last-of-type');
			displayImage = displayElement = preloadedImages[galleryPosition];
			changeCSS(
				displayImage,
				("animation:" + (movement > 0 ? 'bpfl' : 'bpfr') + " .35s;transition:transform .35s")
			);
			changeCSS(oldimg, ("animation:" + (movement > 0 ? 'bpfol' : 'bpfor') + " .35s both"));
			container[appendEl](displayImage);
			// update el for closing animation
			if (activeEl.el) {
				el = activeEl.el;
			}
		}
		// show / hide caption
		toggleCaption(galleryEls[galleryPosition].caption);
		// execute onChangeImage callback
		onChangeImage && onChangeImage([displayImage, galleryEls[galleryPosition]]);
	}

	// create video iframe
	function createIframe() {
		var url;
		var prefix = 'https://';
		var suffix = 'autoplay=1';

		// create appropriate url
		if (opts.ytSrc) {
			url = prefix + "www.youtube.com/embed/" + siteVidID + "?html5=1&rel=0&playsinline=1&" + suffix;
		} else if (opts.vimeoSrc) {
			url = prefix + "player.vimeo.com/video/" + siteVidID + "?" + suffix;
		} else if (opts.iframeSrc) {
			url = opts.iframeSrc;
		}

		// add loading spinner to iframe container
		changeCSS(loadingIcon, '');
		iframeContainer[appendEl](loadingIcon);

		// set iframe src to url
		iframeSiteVid.src = url;

		updateIframeDimensions();

		setTimeout(open, 9);
	}

	function updateIframeDimensions() {
		var height;
		var width;

		// handle height / width / aspect / max width for iframe
		var windowHeight = window.innerHeight * 0.95;
		var windowWidth = window.innerWidth * 0.95;
		var windowAspect = windowHeight / windowWidth;

		var ref = opts.dimensions || [1920, 1080];
		var dimensionWidth = ref[0];
		var dimensionHeight = ref[1];

		var iframeAspect = dimensionHeight / dimensionWidth;

		if (iframeAspect > windowAspect) {
			height = Math.min(dimensionHeight, windowHeight);
			width = height / iframeAspect;
		} else {
			width = Math.min(dimensionWidth, windowWidth);
			height = width * iframeAspect;
		}

		iframeContainer.style.cssText += "width:" + width + "px;height:" + height + "px;";
	}

	// timeout to check video status while loading
	function checkMedia(errMsg) {
		if (~[1, 4].indexOf(displayElement.readyState)) {
			open();
			// short timeout to to make sure controls show in safari 11
			setTimeout(function () {
				displayElement.play();
			}, 99);
		} else if (displayElement.error) {
			open(errMsg);
		} else {
			checkMediaTimeout = setTimeout(checkMedia, 35, errMsg);
		}
	}

	// hide / show loading icon
	function toggleLoadingIcon(bool) {
		// don't show loading icon if noLoader is specified
		if (opts.noLoader) {
			return
		}
		// bool is true if we want to show icon, false if we want to remove
		// change style to match trigger element dimensions if we want to show
		bool &&
			changeCSS(
				loadingIcon,
				("top:" + (el.offsetTop) + "px;left:" + (el.offsetLeft) + "px;height:" + (el.clientHeight) + "px;width:" + (el.clientWidth) + "px")
			);
		// add or remove loader from DOM
		el.parentElement[bool ? appendEl : removeEl](loadingIcon);
		isLoading = bool;
	}

	// hide & show caption
	function toggleCaption(captionContent) {
		if (captionContent) {
			captionText.innerHTML = captionContent;
		}
		changeCSS(
			caption,
			("opacity:" + (captionContent ? "1;pointer-events:auto" : '0'))
		);
	}

	function addToImgCache(url) {
		!~imgCache.indexOf(url) && imgCache.push(url);
	}

	// animate open of image / video; display caption if needed
	function open(err) {
		// hide loading spinner
		isLoading && toggleLoadingIcon();

		// execute animationStart callback
		animationStart && animationStart();

		// check if we have an error string instead of normal event
		if (typeof err === 'string') {
			removeContainer();
			return opts.onError
				? opts.onError()
				: alert(("Error: The requested " + err + " could not be loaded."))
		}

		// if remote image is loaded, add url to imgCache array
		remoteImage && addToImgCache(imgSrc);

		// transform displayEl to match trigger el
		displayElement.style.cssText += getRect();

		// fade in container
		changeCSS(container, "opacity:1;pointer-events:auto");

		// set animationEnd callback to run after animation ends (cleared if container closed)
		animationEnd = setTimeout(animationEnd, 410);

		isOpen = true;

		galleryOpen = !!galleryEls;

		// enlarge displayEl, fade in caption if hasCaption
		setTimeout(function () {
			displayElement.classList.add('rounded-lg', 'shadow-cover'); // FV
			displayElement.style.cssText += 'transition:transform .35s;transform:none';
			captionContent && setTimeout(toggleCaption, 250, captionContent);
		}, 60);
	}

	// close active display element
	function close(e) {
		var target = e ? e.target : container;
		var clickEls = [
			caption,
			displayVideo,
			displayAudio,
			captionText,
			leftArrowBtn,
			rightArrowBtn,
			loadingIcon ];

		// blur to hide close button focus style
		target.blur();

		// don't close if one of the clickEls was clicked or container is already closing
		if (isClosing || ~clickEls.indexOf(target)) {
			return
		}

		// animate closing
		displayElement.style.cssText += getRect();
		changeCSS(container, 'pointer-events:auto');

		// timeout to remove els from dom; use variable to avoid calling more than once
		setTimeout(removeContainer, 350);

		// clear animationEnd timeout
		clearTimeout(animationEnd);

		isOpen = false;
		isClosing = true;
	}

	// remove container / display element from the DOM
	function removeContainer() {
		// clear src of displayElement (or iframe if display el is iframe container)
		// needs to be done before removing container in IE
		var srcEl =
			displayElement === iframeContainer ? iframeSiteVid : displayElement;
		srcEl.removeAttribute('src');

		// remove container from DOM & clear inline style
		document.body[removeEl](container);
		container[removeEl](displayElement);
		changeCSS(container, '');
		changeCSS(displayElement, '');

		// remove caption
		toggleCaption(false);

		if (galleryOpen) {
			// remove all gallery stuff
			var images = container.querySelectorAll('img');
			for (var i = 0; i < images.length; i++) {
				container[removeEl](images[i]);
			}
			isLoading && container[removeEl](loadingIcon);
			galleryOpen = galleryEls = false;
			preloadedImages = {};
			supportsTouch || container[removeEl](rightArrowBtn);
			supportsTouch || container[removeEl](leftArrowBtn);
			// in case displayimage changed, we need to update event listeners
			displayImage.onload = open;
			displayImage.onerror = open.bind(null, 'image');
		}

		// run close callback
		opts.onClose && opts.onClose();

		isClosing = isLoading = false;
	}

	// style helper functions
	function changeCSS(ref, newStyle) {
		var style = ref.style;

		style.cssText = newStyle;
	}

	return BigPicture;

}());
