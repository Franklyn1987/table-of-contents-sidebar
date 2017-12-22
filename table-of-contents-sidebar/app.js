chrome.storage.sync.get({
    position: 'right',
    tocs_toggle: true,
    hover: true,
    block_list: [],
    theme: ""
}, function (items) {
    var toggle = items.tocs_toggle;
    var block_list = items.block_list;
    var theme = items.theme;
    if (!toggle) return;
    if (isBlocked(block_list)) return;
    var nodes = parseLinkableNodes();
    if (nodes.length <= 3) return;
    injectCss(theme);
    var fixedSidebarNode = createFixedSidebarNode();
    var fixedMenuNode = createFixedMenuNode();
    fixedSidebarNode.appendChild(createOptionsNode(items.hover, items.position));
    fixedSidebarNode.appendChildren(nodes);
    fixedSidebarNode.appendChild(createCopyrightNode());
    var doc = document.createElement("div");
    doc.id = "table-of-contents-sidebar-fixed-sidebar-tooltip";
    fixedSidebarNode.appendChild(doc);
    restoreOptions(items, fixedSidebarNode, fixedMenuNode);
    document.body.appendChild(fixedSidebarNode);
    document.body.appendChild(fixedMenuNode);
    Tooltip.tooltip = document.getElementById('table-of-contents-sidebar-fixed-sidebar-tooltip');
});
var fixedHeight = 0;
var isOverflow = false;

var Tooltip = {
    tooltip: undefined,
    target: undefined,
    show: function() {
        Tooltip.target = this;
        var tip = Tooltip.target['tooltip'];
        if( !tip || tip == '' ) {            
            return false;
        }
        Tooltip.tooltip.innerHTML = tip ;
        if( window.innerWidth < Tooltip.tooltip.offsetWidth * 1.5 ) {
            Tooltip.tooltip.style.maxWidth = (window.innerWidth / 2)+'px';
        }
        else {
            Tooltip.tooltip.style.maxWidth = 250 + 'px';
        }
        
        var pos_left = Tooltip.target.offsetLeft + ( Tooltip.target.offsetWidth / 2 ) - ( Tooltip.tooltip.offsetWidth / 2 ),
            pos_top  = Tooltip.target.offsetTop - Tooltip.tooltip.offsetHeight - 20;
        Tooltip.tooltip.className = '';
        console.log('('+pos_left+', '+pos_top+')')

        if( pos_left < 0 ) {
            pos_left = Tooltip.target.offsetLeft + Tooltip.target.offsetWidth / 2 - 20;
            Tooltip.tooltip.className += ' left';
        }
        
        if( pos_left + Tooltip.tooltip.offsetWidth > window.innerWidth ) {
            pos_left = Tooltip.target.offsetLeft - Tooltip.tooltip.offsetWidth + Tooltip.target.offsetWidth / 2 + 20;
            Tooltip.tooltip.className +=' right';
        }
        
        if( pos_top < 0 ) {
            var pos_top  = Tooltip.target.offsetTop + Tooltip.target.offsetHeight;
            Tooltip.tooltip.className += ' top';
        }
        
        Tooltip.tooltip.style.left = pos_left + 'px';
        Tooltip.tooltip.style.top = pos_top + 'px';
        Tooltip.tooltip.className += ' show';
    },
    hide: function() {
        Tooltip.tooltip.className = Tooltip.tooltip.className.replace('show', '');
    }
};

window.onscroll = function() {
    var height = 0;
    var documents = document.getElementsByTagName('*');
    for (var i = 0, l = documents.length; i < l; i++) {
        var node = documents[i];
        if(node.id == "table-of-contents-sidebar-id") continue;
        var style = window.getComputedStyle(node,null);
        var position = style.getPropertyValue("position");
        var top =  style.getPropertyValue("top");
        if(position == "fixed" && top == "0px" && node.offsetHeight < 200) {
            height += node.offsetHeight;
        }
     }
     fixedHeight = height;
}

function restoreOptions(optionsItems, sidebar, menu) {
    if (optionsItems) {
        var position = optionsItems.position;
        var hover = optionsItems.hover;
        if (position == "right") {
            activeRight(sidebar, menu);
        } else {
            activeLeft(sidebar, menu);
        }
        if (hover) {
            activeUnpin(sidebar, menu);
        } else {
            activePin(sidebar, menu);
        }

    } else {
        chrome.storage.sync.get({
            position: 'right',
            tocs_toggle: false,
            hover: false
        }, function (items) {
            if (items.tocs_toggle == false) {
                return;
            }
            restoreOptions(items);
        });
    }
}

function injectCss(path) {
    var link = document.createElement("link");
    link.href = chrome.extension.getURL(!!path ? path : "table-of-contents-sidebar.css");
    link.type = "text/css";
    link.rel = "stylesheet";
    var headNode = document.getElementsByTagName("head");
    if (headNode) {
        headNode[0].appendChild(link);
    } else {
        document.body.appendChild(link);
    }
}

function fixedSidebarPinBtnNode() {
    var element = document.getElementById("table-of-contents-sidebar-pin-id");
    return element;
}
function fixedSidebarPositionBtnNode() {
    var element = document.getElementById("table-of-contents-sidebar-position-id");
    return element;
}
function fixedSidebarNode() {
    var element = document.getElementById("table-of-contents-sidebar-id");
    return element;
}

function fixedSidebarMenuNode() {
    var element = document.getElementById("table-of-contents-sidebar-hover-menu-id");
    return element;
}

function isBlocked(block_list) {
    if (!block_list || block_list.length == 0) return false;
    var domain = document.domain;
    var block = false;
    for (var i = 0; i < block_list.length; i++) {
        if (domain.indexOf(block_list[i]) != -1) {
            block = true;
        }
    }
    return block;
}

function parseLinkableNodes() {
    var documents = document.getElementsByTagName('*');
    var iteratorAbsTop = 0;
    var sidebarCount = 0;
    var matchesNodes = [];
    for (var i = 0, l = documents.length; i < l; i++) {
        var node = documents[i];
        var style = window.getComputedStyle(node,null);
        var position = style.getPropertyValue("position");
        var top =  style.getPropertyValue("top");
        if(position == "fixed" && top == "0px" && node.offsetHeight < 200) {
            fixedHeight += node.offsetHeight;
        }
        if (!!node && !!node.textContent && !!node.textContent.trim()
            && (node.nodeName == "H1" || node.nodeName == "H2" || node.nodeName == "H3"
            || node.nodeName == "H4" || node.nodeName == "H5" || node.nodeName == "H6")) {
            var absTop = node.getBoundingClientRect().top + document.documentElement.scrollTop;
            if(absTop > document.body.offsetHeight){
                isOverflow = true;
            }
            if (!!matchesNodes && matchesNodes.length != 0) {
                var previous = matchesNodes[matchesNodes.length - 1];
                if (absTop == previous.absTop) {
                    continue;
                }
            }
            // comment tricky logic
            // if (sidebarCount > 0 && absTop < iteratorAbsTop) {
            //     break;
            // }
            if (!node.id) {
                node.id = uuid();
            }
            var data = {
                id: node.id,
                text: node.textContent,
                name: node.nodeName,
                absTop: absTop
            };
            matchesNodes.push(data);
            iteratorAbsTop = absTop;
            sidebarCount++;
        }
    }
    return matchesNodes;
}

function createFixedSidebarNode() {
    var fixedSidebarNode = document.createElement('div');
    fixedSidebarNode.id = "table-of-contents-sidebar-id";
    fixedSidebarNode.className = "table-of-contents-sidebar-fixed-sidebar";
    return fixedSidebarNode;
}

function createFixedMenuNode() {
    var sidebar = fixedSidebarNode();
    var left = null, right = "18px";
    if (sidebar) {
        sidebar.style.left;
        sidebar.style.right;
    }
    var fixedSidebarHoverMenu = document.createElement('img');
    fixedSidebarHoverMenu.id = "table-of-contents-sidebar-hover-menu-id";
    fixedSidebarHoverMenu.src = getImageUrl("images/icon/ic_normal.png");
    fixedSidebarHoverMenu.className = "table-of-contents-sidebar-menu";
    fixedSidebarHoverMenu.style.left = left;
    fixedSidebarHoverMenu.style.right = right;
    fixedSidebarHoverMenu.addEventListener('mouseover', mouseOverEvent);
    fixedSidebarHoverMenu.addEventListener('mouseout', mouseOutEvent);
    return fixedSidebarHoverMenu;
}

function sidebarMouseOutEvent(e) {
    e.stopPropagation();
    var sidebar = !!sidebar ? sidebar : fixedSidebarNode();
    sidebar.style.width = "0";
}

function sidebarMouseOverEvent(e) {
    e.stopPropagation();
    var sidebar = !!sidebar ? sidebar : fixedSidebarNode();
    sidebar.style.width = "250px";
}

function mouseOutEvent(e) {
    e.stopPropagation();
    var sidebar = fixedSidebarNode();
    sidebar.style.width = "0";
    sidebar.addEventListener('mouseout', sidebarMouseOutEvent);
    sidebar.addEventListener('mouseover', sidebarMouseOverEvent);
}
function mouseOverEvent(e) {
    e.stopPropagation();
    var sidebar = fixedSidebarNode();
    if (sidebar) {
        sidebar.style.width = "250px";
        sidebar.addEventListener('mouseout', sidebarMouseOutEvent);
        sidebar.addEventListener('mouseover', sidebarMouseOverEvent);
    }
}

function uuid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

function activeLeft(sidebar, menu) {
    var positionNode = fixedSidebarPositionBtnNode();
    if (positionNode) {
        positionNode.src = getImageUrl("images/right.png");
        positionNode.addEventListener('click', function (e) {
            e.stopPropagation();
            activeRight();
        });
    }
    var sidebar = !!sidebar ? sidebar : fixedSidebarNode();
    var menu = !!menu ? menu : fixedSidebarMenuNode();
    if (sidebar) {
        sidebar.style.left = "0px";
        sidebar.style.right = null;
    }
    if (menu) {
        menu.style.left = "18px";
        menu.style.right = null;
    }
}
function activeRight(sidebar, menu) {
    var positionNode = fixedSidebarPositionBtnNode();
    if (positionNode) {
        positionNode.src = getImageUrl("images/left.png");
        positionNode.addEventListener('click', function (e) {
            e.stopPropagation();
            activeLeft();
        });
    }
    var sidebar = !!sidebar ? sidebar : fixedSidebarNode();
    var menu = !!menu ? menu : fixedSidebarMenuNode();
    if (sidebar) {
        sidebar.style.right = "0px";
        sidebar.style.left = null;
    }
    if (menu) {
        menu.style.right = "18px";
        menu.style.left = null;
    }
}
function activePin(sidebar, menu) {
    var pinNode = fixedSidebarPinBtnNode();
    if (pinNode) {
        pinNode.src = getImageUrl("images/pin.png");
        pinNode.addEventListener('click', function (e) {
            e.stopPropagation();
            activeUnpin();
        });
    }
    var sidebar = !!sidebar ? sidebar : fixedSidebarNode();
    var menu = !!menu ? menu : fixedSidebarMenuNode();
    if (sidebar) {
        sidebar.removeEventListener('mouseout', sidebarMouseOutEvent, false);
        sidebar.removeEventListener('mouseover', sidebarMouseOverEvent, false);
        sidebar.style.width = "250px";
    }
    if (menu) {
        menu.removeEventListener('mouseout', mouseOutEvent, false);
        menu.removeEventListener('mouseover', mouseOverEvent, false);
    }
}

function activeUnpin(sidebar, menu) {
    var pinNode = fixedSidebarPinBtnNode();
    if (pinNode) {
        pinNode.src = getImageUrl("images/unpin.png");
        pinNode.addEventListener('click', function (e) {
            e.stopPropagation();
            activePin();
        });
    }
    var sidebar = !!sidebar ? sidebar : fixedSidebarNode();
    var menu = !!menu ? menu : fixedSidebarMenuNode();
    if (sidebar) {
        // sidebar.style.width = '0';
        sidebar.addEventListener('mouseout', sidebarMouseOutEvent);
        sidebar.addEventListener('mouseover', sidebarMouseOverEvent);
    }
    if (menu) {
        menu.style.display = "block";
        menu.addEventListener('mouseover', mouseOverEvent);
        menu.addEventListener('mouseout', mouseOutEvent);
    }
}

function createCopyrightNode() {
    var span = document.createElement('span');
    span.className = "copyright";
    var yiting = document.createElement('a');
    yiting.appendChild(document.createTextNode("Yiting"));
    yiting.title = "Yiting";
    yiting.href = "https://yiting.myportfolio.com";
    yiting.target = "_blank";
    var majiang = document.createElement('a');
    majiang.appendChild(document.createTextNode("Majiang"));
    majiang.title = "Majiang";
    majiang.href = "http://www.majiang.life";
    majiang.target = "_blank";
    var copyright = document.createTextNode("©copyright ");
    var and = document.createTextNode(" & ");
    span.appendChild(copyright);
    span.appendChild(yiting);
    span.appendChild(and);
    span.appendChild(majiang);
    return span;
}

function createOptionsNode(isUnpin,position) {
    var optionsContainer = createSpanNode("");

    var leftBtn = createImageNode("images/right.png", "Right");
    leftBtn.id = "table-of-contents-sidebar-position-id";
    if (!!position && position == "right") {
        leftBtn.src = getImageUrl("images/left.png");
        leftBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            activeLeft();
        });
    } else {
        leftBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            activeRight();
        });
    }

    var pinBtn = createImageNode("images/unpin.png", "Pin");
    pinBtn.id = "table-of-contents-sidebar-pin-id";
    if (!isUnpin) {
        pinBtn.src = getImageUrl("images/pin.png");
        pinBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            activeUnpin();
        });
    } else {
        pinBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            activePin();
        });
    }

    var optionBtn = createImageNode("images/settings.png", "Settings");
    optionBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        window.open(chrome.runtime.getURL('options.html'), '_blank');
    });
    var bugBtn = createImageNode("images/bug.png", "Report Bugs");
    bugBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        window.open('https://github.com/codedrinker/table-of-contents-sidebar/issues', '_blank');
    });
    var githubBtn = createImageNode("images/github.png", "Fork on GitHub");
    githubBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        window.open('https://github.com/codedrinker/table-of-contents-sidebar', '_blank');
    });

    optionsContainer.appendChild(leftBtn);
    optionsContainer.appendChild(pinBtn);
    // optionsContainer.appendChild(optionBtn);
    optionsContainer.appendChild(bugBtn);
    optionsContainer.appendChild(githubBtn);
    optionsContainer.appendChild(document.createElement('br'));
    return optionsContainer;
}

function createImageNode(url, title, size) {
    var image = document.createElement('img');
    image.style.marginLeft = "12px";
    image.style.height = !!size ? size : "22px";
    image.style.width = !!size ? size : "22px";
    image.style.cursor = "pointer";
    image.alt = title;
    image.title = title;
    image.src = getImageUrl(url);
    return image;
}

function createSpanNode(text) {
    var span = document.createElement('span');
    var textNode = document.createTextNode(text);
    span.appendChild(textNode);
    return span;
}

function getImageUrl(name) {
    var image = chrome.extension.getURL(name);
    return image;
}

Node.prototype.appendChildren = function (children) {
    var that = this;
    var ul = document.createElement("ul");
    for (var i = 0, l = children.length; i < l; i++) {
        var li = document.createElement("li");
        var refNode = document.createElement('a');
        var text = document.createTextNode(children[i].text);
        refNode.appendChild(text);
        refNode.tooltip = children[i].text;
        refNode.href = "#" + children[i].id;
        var className = children[i].name + "-ANCHOR";
        refNode.className = className;
        refNode.addEventListener('mouseover', Tooltip.show);
        refNode.addEventListener('mouseleave', Tooltip.hide);
        refNode.addEventListener('click', function (e) {
            e.preventDefault();
            var id = e.srcElement.hash.substr(1);
            var doc = document.getElementById(id);
            var top = doc.getBoundingClientRect().top + window.scrollY - fixedHeight;
            if(isOverflow) {
                window.location.hash = e.srcElement.hash; 
            } else {
                window.scroll({
                  top: top,
                  left: 0, 
                  behavior: 'smooth'
                });
            }
         });
        li.appendChild(refNode);
        ul.appendChild(li);
    }
    that.appendChild(ul);
};