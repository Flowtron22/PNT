export const COSTUMES=[
 {id:'thief',name:'Thief',tag:'Classic getaway gear',file:null},
 {id:'police',name:'Police',tag:'Ready for the chase',file:null},
 {id:'oyen',name:'Oyen',tag:'Orange troublemaker',file:'oyen'},
 {id:'pingu',name:'Pingu',tag:'Cool under pressure',file:'pingu'},
 {id:'pumpkin',name:'Pumpkin',tag:'A little spooky',file:'pumpkin'},
 {id:'boney',name:'Boney',tag:'Bone to run',file:'boney'},
 {id:'purple',name:'Purple',tag:'Stand out. Run fast.',file:'purple'},
 {id:'racer',name:'Racer',tag:'Born for the chase',file:'racer'},
 {id:'raptor',name:'Raptor',tag:'Tiny arms. Big escape.',file:'raptor'},
];
export const TOOLS=[
 {id:'hammer',name:'Hammer',key:'SMASH',icon:'hammer',clip:'hammer',cooldown:10,type:'STUN',description:'Stun opponents within 2 metres for 2 seconds. 10 second cooldown.'},
 {id:'banana',name:'Banana Skin',key:'DROP',icon:'banana',clip:'banana',cooldown:5,type:'TRAP',description:'Drop a peel that spins an opponent for 2 seconds. Peels last 15 seconds; maximum 5. 5 second cooldown.'},
 {id:'rocket',name:'Jetpack',key:'BOOST',icon:'rocket',clip:'rocket',cooldown:15,type:'MOVEMENT',description:'Launch and fly for 5 seconds. Steer with movement. 15 second cooldown.'},
 {id:'smoke',name:'Smoke Bomb',key:'SMOKE',icon:'smoke',clip:'idle',cooldown:30,type:'COVER',description:'Deploy a smoke cloud that blocks sight and capture through it for 20 seconds. Maximum 3 clouds. 30 second cooldown.'},
 {id:'rewind',name:'Rewind Box',key:'MARK',icon:'rewind',clip:'idle',cooldown:10,type:'RETURN',description:'First press places a marker. Press again to return to it. Cannot escape capture. 10 second cooldown after returning.'},
];
export const ANIMATION_PREVIEWS=[['idle','Idle'],['thiefRun','Thief run'],['policeRun','Police run'],['hammer','Hammer'],['stunned','Stunned'],['airStunned','Air stunned'],['banana','Banana spin'],['rocket','Rocket launch'],['jet','Rocket jet'],['busted','Busted'],['bustedIdle','Caught idle'],['dance','Dance']];
