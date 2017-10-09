class Event {
    static on(type, handler) {
        return document.addEventListener(type, handler)
    }
    static trigger(type, data) {
        return document.dispatchEvent(new CustomEvent(type, {
            detail: data
        }))
    }
}

class searchModule {
    constructor(){
        this.searchInput = document.querySelector('#serachInput')
        this.closeBox = document.getElementById('closeBox')
        this.goTop = document.querySelector('.goTop')
        this.bind()
    }
    bind(){
        this.searchInput.oninput = this.throttle(()=>{
            Event.trigger('search',this.searchInput.value)
            this.closeBox.classList.add('active')
        },300)
        this.closeBox.onclick = this.throttle(()=>{ 
            this.searchInput.value = ''
            this.closeBox.classList.remove('active')
        },300)

        this.goTop.onclick = (()=>{
            document.documentElement.scrollTop = document.body.scrollTop =0;
        })
        document.body.onresize = this.throttle(()=>
            Event.trigger('resize'),300)
        document.body.onscroll = this.throttle(() => {
            if(this.isToBottom()){
                Event.trigger('bottom')
            }
        })
    }
    throttle(fn, delay){
        let timer =null
        return () => {
            clearTimeout(timer)
            timer = setTimeout(() => fn.bind(this)(arguments),delay)
        }
    }
    isToBottom(){
        return document.body.scrollHeight - document.body.scrollTop - document.documentElement.clientHeight < 5
    }
}
new searchModule()

class loadModule{
    constructor(){
        this.page = 1
        this.per_page =10
        this.keyword = ''
        this.total_hits = 0
        this.url = '//pixabay.com/api/'
        this.bind()
    }
    bind(){
        Event.on('search', e =>{
            this.page = 1
            this.keyword = e.detail
            this.loadData()
                .then(data =>{
                    // console.log(this)
                    this.total_hits = data.totalHits
                    Event.trigger('load_first',data)
                })
                .catch(err => console.log(err))
        })
        Event.on('bottom',e =>{
            if(this.loading)return
            if(this.page * this.per_page > this.total_hits){
                Event.trigger('load_over')
                return
            }
            this.page++
            this.loading = true
            this.loadData()
                .then(data => Event.trigger('load_more',data))
                .catch(err => console.log(err))
        })
    }
    loadData(){
        return fetch(this.fullUrl(this.url,{
            key: '5856858-0ecb4651f10bff79efd6c1044',
            q: this.keyword,
            image_type: 'photo',
            per_page: 15,
            page: this.page
        }))
        .then((res) =>{
            this.loading = false
            return res.json()
        })
    }
    fullUrl(url, json){
        let arr = []
        for (let key in json) {
            arr.push(encodeURIComponent(key) + '=' + encodeURIComponent(json[key]))
        }
        return url + '?' + arr.join('&')
    }
}
new loadModule()

class layoutModule {
    constructor() {
        this.mainNode = document.querySelector('main')
        this.rowHeightBase = 200
        this.rowTotalWidth = 0
        this.rowList = []
        this.allImgInfo = []
        this.bind()
        this.mainNodeWidth = parseFloat(getComputedStyle(this.mainNode).width) - 35
    }
    bind() {
        Event.on('load_first', e => {
            this.mainNode.innerHTML = ''
            this.allImgInfo = [...e.detail.hits]
            this.render(e.detail.hits)
        })

        Event.on('load_more', e => {
            this.allImgInfo.push(...e.detail.hits)
            this.render(e.detail.hits)
        })

        Event.on('load_over', e => {
            this.layout(this.rowList, this.rowHeightBase)
            this.rowList = []
            this.rowTotalWidth = 0
        })

        Event.on('resize', e => {
            this.mainNode.innerHTML = ''
            this.rowList = []
            this.rowTotalWidth = 0
            this.render(this.allImgInfo)
            this.mainNodeWidth = parseFloat(getComputedStyle(this.mainNode).width) - 20
        })
    }
    render(data) {
        if(!data) return
        data.forEach(imgInfo => {
            imgInfo.ratio = imgInfo.webformatWidth / imgInfo.webformatHeight
            imgInfo.imgWidthAfter = imgInfo.ratio * this.rowHeightBase
            if (this.rowTotalWidth + imgInfo.imgWidthAfter <= this.mainNodeWidth) {
                this.rowList.push(imgInfo)
                this.rowTotalWidth += imgInfo.imgWidthAfter
            } else {
                let rowHeight = (this.mainNodeWidth / this.rowTotalWidth) * this.rowHeightBase
                this.layout(this.rowList, rowHeight)
                this.rowList = [imgInfo]
                this.rowTotalWidth = imgInfo.imgWidthAfter
            }

        })
    }

    layout(row, rowHeight) {
        row.forEach(imgInfo => {
            let figureNode = document.createElement('figure')
            let paintNode = document.createElement('div')
            let imgNode = document.createElement('img')
            let imgUrlNode = document.createElement('a')
            imgUrlNode.href = imgInfo.pageURL
            imgUrlNode.target="_blank"
            imgNode.src = imgInfo.webformatURL
            imgUrlNode.appendChild(paintNode)
            imgUrlNode.appendChild(imgNode)
            figureNode.appendChild(imgUrlNode)
            figureNode.style.height = rowHeight + 'px'
            figureNode.style.width = rowHeight * imgInfo.ratio + 'px'
            this.mainNode.appendChild(figureNode)
        })

    }
}

new layoutModule()
Event.on('search', e=>console.log(e.detail))
Event.trigger('search', 'ocean')
