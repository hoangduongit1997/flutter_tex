"use strict";
var configurations = JSON.parse(getUrlParam('configurations'));
var port = getUrlParam('port');
var isWeb = port == null;
var teXView;

function initTeXView() {
    var httpRequest = new XMLHttpRequest();
    httpRequest.onreadystatechange = function () {
        if (httpRequest.readyState === 4 && httpRequest.status === 200) {
            teXView.appendChild(createTeXView(JSON.parse(httpRequest.responseText)));
            onTeXViewRenderComplete(heightCallback);
        }
    }
    httpRequest.open('GET', "http://localhost:" + port + "/rawData");
    httpRequest.send();
}

function initWebTeXView(viewId, rawData) {
    var initiated = false;

    document.querySelectorAll("flt-platform-view").forEach(function (platformView) {
            var view = platformView.shadowRoot.children[1];
            var iframe = view.contentWindow;
            teXView = iframe.document.getElementById('TeXView');
            if (view.id === viewId && teXView != null) {
                initiated = true;
                teXView.appendChild(createTeXView(JSON.parse(rawData)));
                iframe.onTeXViewRenderComplete(heightCallback);
            }
        }
    );
    if (!initiated) setTimeout(function () {
        initWebTeXView(viewId, rawData)
    }, 250);
}


function createTeXView(viewData) {
    var meta = viewData['meta'];
    var data = viewData['data'];
    var node = meta['node'];
    var element = document.createElement(meta['tag']);
    element.classList.add(meta['type']);
    element.setAttribute('style', viewData['style']);

    switch (node) {
        case 'leaf': {
            if (meta['tag'] === 'img') {
                if (meta['type'] === 'tex-view-asset-image') {
                    element.setAttribute('src', 'http://localhost:' + port + '/' + data);
                } else {
                    element.setAttribute('src', data);
                    element.addEventListener("load", function () {
                        heightCallback();
                    });
                }
            } else {
                element.innerHTML = data;
            }
        }
            break;
        case 'internal_child': {
            element.appendChild(createTeXView(data))
            var id = viewData['id'];
            if (meta['type'] === 'tex-view-ink-well' && id != null) clickManager(element, id, viewData['rippleEffect']);
        }
            break;
        case 'root':
            element.appendChild(createTeXView(data))
            break;
        default: {
            if (meta['type'] === 'tex-view-group') {
                createTeXViewGroup(element, data, viewData['rippleEffect'], viewData['normalItemStyle'], viewData['selectedItemStyle']);
            } else {
                data.forEach(function (childViewData) {
                    element.appendChild(createTeXView(childViewData))
                });
            }
        }
    }
    return element;
}

function createTeXViewGroup(teXViewGroupElement, groupData, rippleEffect, normalItemStyle, selectedItemStyle) {
    var groupItemsIds = [];
    groupData.forEach(function (groupItemData) {
        groupItemData['style'] = normalItemStyle;
        var groupItemElement = createTeXView(groupItemData);
        var groupItemElementId = groupItemData['id'];
        groupItemElement.setAttribute('id', groupItemElementId);
        groupItemsIds.push(groupItemElementId);
        clickManager(groupItemElement, groupItemElementId, rippleEffect, function () {
            groupItemsIds.forEach(function (itemId) {
                if (itemId === groupItemElementId) {
                    groupItemElement.setAttribute('style', selectedItemStyle);
                } else {
                    document.getElementById(itemId).setAttribute('style', normalItemStyle);
                }
                heightCallback();
            })
        })
        teXViewGroupElement.appendChild(groupItemElement);
    });
}

function heightCallback() {
    if (isWeb) {
        RenderedTeXViewHeight(getTeXViewHeight(teXView));
    } else {
        RenderedTeXViewHeight.postMessage(getTeXViewHeight(teXView));
    }
}

function clickManager(element, id, rippleEffect, callback) {
    element.addEventListener('click', function (e) {
        if (callback != null) callback();
        if (isWeb) {
            OnTapCallback(id);
        } else {
            OnTapCallback.postMessage(id);
        }
        if (rippleEffect) {
            var ripple = document.createElement('div');
            this.appendChild(ripple);
            var d = Math.max(this.clientWidth, this.clientHeight);
            ripple.style.width = ripple.style.height = d + 'px';
            var rect = this.getBoundingClientRect();
            ripple.style.left = e.clientX - rect.left - d / 2 + 'px';
            ripple.style.top = e.clientY - rect.top - d / 2 + 'px';
            ripple.classList.add('ripple');
        }
    });
}

function getUrlParam(key) {
    var url = decodeURI(location.href);
    key = key.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + key + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function getTeXViewHeight(element) {
    var height = element.offsetHeight,
        style = window.getComputedStyle(element)
    return ['top', 'bottom']
        .map(function (side) {
            return parseInt(style["margin-" + side]);
        })
        .reduce(function (total, side) {
            return total + side;
        }, height)
}

