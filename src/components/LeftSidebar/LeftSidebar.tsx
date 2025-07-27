import React from 'react';
import './LeftSidebar.css';

interface RoomItemProps {
    room: any;
    isSelected: boolean;
    onSelect: (room: any) => void;
}

const RoomItem: React.FC<RoomItemProps> = ({ room, isSelected, onSelect }) => {
    // В будущем здесь можно будет добавить state для отслеживания, развернут ли список участников
    return (
        <div
            className={`room-item-container ${isSelected ? 'active' : ''}`}
            onClick={() => onSelect(room)}
        >
            <div className="room-name">{room.name}</div>
            {/* Здесь в будущем будет рендериться список участников, если комната выбрана и развернута */}
        </div>
    );
};


interface LeftSidebarProps {
    rooms: any[];
    selectedRoom: any | null;
    onSelectRoom: (room: any) => void;
    isCollapsed: boolean;
    onToggle: () => void;
    onJoinNewRoom: () => void;
    onCreateNewRoom: () => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ rooms, selectedRoom, onSelectRoom, isCollapsed, onToggle, onJoinNewRoom, onCreateNewRoom }) => {
    return (
        <>
            <button onClick={onToggle} className={`sidebar-toggle-btn ${!isCollapsed ? 'open' : ''}`}>
                {isCollapsed ? '☰' : '✕'}
            </button>
            <div className={`left-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-content">
                    <h3>Ваши комнаты</h3>
                    <div className="rooms-list">
                        {rooms.map(room => (
                            <RoomItem
                                key={room.id}
                                room={room}
                                isSelected={selectedRoom?.id === room.id}
                                onSelect={onSelectRoom}
                            />
                        ))}
                    </div>
                    <div className="sidebar-actions">
                        <button onClick={onCreateNewRoom} className="sidebar-action-btn create">Создать</button>
                        <button onClick={onJoinNewRoom} className="sidebar-action-btn join">+ Присоединиться</button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LeftSidebar;
