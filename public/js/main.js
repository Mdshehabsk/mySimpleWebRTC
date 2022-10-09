const socket = io("/");
const my_socket_id = document.getElementById("my_socket_id");
const reciever_id = document.getElementById(`reciever_id`);
const call_btn = document.getElementById(`call_btn`);
const main = document.querySelector('main')
let mySocketId 
socket.on("connect", () => {
  mySocketId = socket.id
  my_socket_id.innerHTML = socket.id;
});
let reciever_value
call_btn.addEventListener("click", (event) => {
  reciever_value = reciever_id.value;
  if (!reciever_value) {
    return alert(`reciever id empty`);
  } else {
    socket.emit("call-offer", reciever_value);
  }
});
let connectedUser 
socket.on('call-offer-sent',(data )=> {
  getLocalAudio()
  const {callerId,recieverId} = data
  if(callerId){
    recieverUiShow(callerId)
    connectedUser = {socketId:callerId}
    socket.emit(`call-offer-sent`,data.callerId)
  }else {
    connectedUser = {socketId:recieverId}
    callerUiShow(recieverId)
  }
})
socket.on('call-accept',recieverId=> {
  createPeerConnection()
})

socket.on('webRTC-signaling',data => {
  switch(data.type){
    case 'offer':
      handleWebRTCOffer(data)
    break;
    case 'answer':
      handleWebRTCAnswer(data)
    break;
    case 'iceCandidate':
      handleWebRTCCandidate(data)
  }
})

const recieverUiShow = (callerId) => {
  const call_recieve_div = document.createElement('div')
  call_recieve_div.classList.add('call_recieve_div')
  const h3 = document.createElement('h3')
  h3.innerHTML =  `${callerId} is Calling `
  call_recieve_div.appendChild(h3)
  const buttons = document.createElement('div')
  buttons.classList.add('buttons')
  const Accept = document.createElement('button')
  Accept.setAttribute('id','accept')
  Accept.innerHTML = 'Accept'
  buttons.appendChild(Accept)
  const Reject = document.createElement('button')
  Reject.setAttribute('id','reject')
  Reject.innerHTML = `Reject`
  buttons.appendChild(Reject)
  call_recieve_div.appendChild(buttons)
  main.appendChild(call_recieve_div)

   document.getElementById('accept').addEventListener('click',()=> {acceptCallHandler(callerId)})
   document.getElementById('reject').addEventListener('click',rejectCallHandler)
   
};
const callerUiShow = recieverId => {
  const call_recieve_div = document.createElement('div')
  call_recieve_div.classList.add('call_recieve_div')
  const h3 = document.createElement('h3')
  h3.innerHTML =  ` Your'e calling ${recieverId} `
  call_recieve_div.appendChild(h3)
  const buttons = document.createElement('div')
  buttons.classList.add('buttons')
  const Reject = document.createElement('button')
  Reject.setAttribute('id','reject')
  Reject.innerHTML = `Reject`
  buttons.appendChild(Reject)
  call_recieve_div.appendChild(buttons)
  main.appendChild(call_recieve_div)
  //  document.getElementById('reject').addEventListener('click',rejectCallHandler)
}


let localStream ,peerConnection
const localAudio = document.getElementById('local_audio')
const remoteAudio = document.getElementById('remote_audio')
const getLocalAudio = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({audio:true})
     localStream = stream;
    localAudio.srcObject = stream
    localAudio.addEventListener('loadedmetadata',()=> {
      localAudio.play()
    })
  }catch(err){
    console.log(err)
  }

}
const getRemoteAudio = async (remoteStream) => {
  remoteAudio.srcObject = remoteStream
}

const configuration = {
  iceServers :[
    {
      urls: "stun:openrelay.metered.ca:80",
    },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ]
}

const createPeerConnection = async () => {
  peerConnection = new RTCPeerConnection(configuration)
  peerConnection.onicecandidate = event => {
    if(event.candidate){
      sendWebRTCOfferUsingSignaling({
        type:'iceCandidate',
        candidate:event.candidate,
        connectedUserSocketId:connectedUser.socketId
      })
    }
  }
  peerConnection.onsignalingstatechange = event => {
    if(peerConnection.connectionState === 'connected'){
      console.log(`successfull connected to other user`)
    }
  }
  const remoteStream = new MediaStream()
  getRemoteAudio(remoteStream)
  peerConnection.ontrack = event => {
    remoteStream.addTrack(event.track)
  }
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track,localStream)
  })
}

const sendWebRTCOfferUsingSignaling = (data) => {
  socket.emit('webRTC-signaling',data)
}


const sendRTCOffer = async () => {
  const offer = await peerConnection.createOffer()
  await peerConnection.setLocalDescription(offer)
  sendWebRTCOfferUsingSignaling({
    type:'offer',
    offer,
    connectedUserSocketId:connectedUser.socketId
  })
}
const handleWebRTCOffer = async data => {
  try {
    
    await peerConnection.setRemoteDescription(data.offer)
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)
    sendWebRTCOfferUsingSignaling({
      connectedUserSocketId:connectedUser.socketId,
      type:'answer',
      answer
    })
  }
  catch(err){
    console.log(err)
  }
}
const handleWebRTCAnswer = async data => {
  await peerConnection.setRemoteDescription(data.answer)
}

const handleWebRTCCandidate = async data => {
  try {
    await peerConnection.addIceCandidate(data.candidate)
  }
  catch(err){
    console.log(err)
  }
}
const acceptCallHandler = (callerId) => {
  createPeerConnection()
  sendRTCOffer()
  socket.emit('call-accept',{callerId})
}
const rejectCallHandler = () => {
  
}